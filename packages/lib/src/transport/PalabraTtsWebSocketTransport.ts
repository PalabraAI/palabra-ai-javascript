import { RealtimeTransport } from '~/transport/RealtimeTransport.model';
import {
  EVENT_TTS_CONNECTED,
  EVENT_TTS_CONNECTION_STATE_CHANGED,
  EVENT_TTS_DISCONNECTED,
  EVENT_TTS_ERROR_RECEIVED,
  EVENT_TTS_MESSAGE_RECEIVED,
  PalabraTtsWebSocketTransportConstructor,
  TtsConnectionState,
  TtsSendTextOptions,
} from '~/transport/PalabraTtsWebSocketTransport.model';
import { PalabraTtsBaseEventEmitter } from '~/PalabraTtsBaseEventEmitter';
import { TtsConfigManager } from '~/tts/TtsConfigManager';
import { TtsClientMessage } from '~/tts/TtsConfig.model';
import {
  TTS_CONNECTION_TIMEOUT_MS,
  TTS_MAX_TEXT_LENGTH,
  TTS_MIN_SEND_INTERVAL_MS,
} from '~/tts/TtsDefaults';
import { handleReceivedTtsData } from '~/utils/tts-data-filters';
import { TtsServerMessage } from '~/utils/tts-data-filters.model';

const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

export class PalabraTtsWebSocketTransport extends PalabraTtsBaseEventEmitter implements RealtimeTransport {
  private readonly streamUrl: string;
  private readonly token: string;
  private readonly connectionTimeoutMs: number;
  private configManager: TtsConfigManager;
  private socket: WebSocket | null = null;
  private connectionState: TtsConnectionState = 'init';
  private lastSentAt = 0;
  private sendQueue: Promise<void> = Promise.resolve();
  private queueEpoch = 0;

  constructor(data: PalabraTtsWebSocketTransportConstructor) {
    super();

    this.streamUrl = data.streamUrl;
    this.token = data.token;
    this.configManager = data.configManager;
    this.connectionTimeoutMs = data.connectionTimeoutMs ?? TTS_CONNECTION_TIMEOUT_MS;
  }

  async connect(): Promise<void> {
    if (this.socket) return;

    try {
      console.log('✅ Connecting to the TTS stream... ' + this.streamUrl);

      this.setConnectionState('connecting');

      this.socket = await this.openSocket();

      await this.init();

      this.setConnectionState('connected');
      this.emit(EVENT_TTS_CONNECTED);

      console.log('✅ Successfully connected to the TTS stream');
    } catch (error) {
      console.error('❌ Failed to connect to the TTS stream:', error);
      this.cleanupSocket();
      this.setConnectionState('disconnected');
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    const socket = this.socket;

    if (!socket || socket.readyState === WebSocket.CLOSED) {
      this.cleanupSocket();
      this.setConnectionState('disconnected');
      return;
    }

    await new Promise<void>(resolve => {
      socket.addEventListener('close', () => resolve(), { once: true });
      socket.close(1000, 'Client disconnect');
    });
  }

  async init(): Promise<void> {
    await this.sendMessage(this.configManager.getInitMessage());
  }

  async sendText(text: string, options: TtsSendTextOptions = {}): Promise<void> {
    if (text.length > TTS_MAX_TEXT_LENGTH) {
      throw new Error(`Text chunk is too long: ${text.length} characters, ${TTS_MAX_TEXT_LENGTH} allowed`);
    }

    await this.sendMessage({
      type: 'text',
      text,
      is_eos: options.isEos ?? false,
      ...(options.generationId ? { generation_id: options.generationId } : {}),
    });
  }

  async cancel(): Promise<void> {
    this.clearSendQueue();

    if (!this.isConnected()) return;

    this.write({ type: 'cancel' });
  }

  clearSendQueue(): void {
    this.queueEpoch += 1;
    this.sendQueue = Promise.resolve();
  }

  async sendMessage(message: TtsClientMessage): Promise<void> {
    const epoch = this.queueEpoch;

    const result = this.sendQueue.then(() => {
      if (epoch !== this.queueEpoch) return;
      return this.writeMessage(message);
    });

    this.sendQueue = result.catch(() => undefined);
    return result;
  }

  private async writeMessage(message: TtsClientMessage): Promise<void> {
    const sinceLastSend = Date.now() - this.lastSentAt;

    if (sinceLastSend < TTS_MIN_SEND_INTERVAL_MS) {
      await wait(TTS_MIN_SEND_INTERVAL_MS - sinceLastSend);
    }

    this.write(message);
  }

  private write(message: TtsClientMessage): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error('TTS stream is not connected');
    }

    this.socket.send(JSON.stringify(message));
    this.lastSentAt = Date.now();
  }

  private buildUrl(): string {
    const url = new URL(this.streamUrl);
    url.searchParams.set('token', this.token);
    return url.toString();
  }

  private openSocket(): Promise<WebSocket> {
    return new Promise<WebSocket>((resolve, reject) => {
      const socket = new WebSocket(this.buildUrl());
      let isSettled = false;

      const timeoutId = setTimeout(() => {
        isSettled = true;
        socket.close();
        reject(new Error(`Connection to the TTS stream timed out after ${this.connectionTimeoutMs}ms`));
      }, this.connectionTimeoutMs);

      socket.addEventListener('open', () => {
        if (isSettled) return;
        isSettled = true;
        clearTimeout(timeoutId);
        this.setupSocketHandlers(socket);
        resolve(socket);
      }, { once: true });

      socket.addEventListener('error', () => {
        if (isSettled) return;
        isSettled = true;
        clearTimeout(timeoutId);
        reject(new Error('Failed to connect to the TTS stream'));
      }, { once: true });
    });
  }

  private setupSocketHandlers(socket: WebSocket): void {
    socket.addEventListener('message', (event: MessageEvent) => {
      this.handleSocketMessage(event.data);
    });

    socket.addEventListener('error', () => {
      console.error('❌ TTS stream error');
      this.emit(EVENT_TTS_ERROR_RECEIVED, { code: 'UNKNOWN_ERROR', desc: 'TTS stream error' });
    });

    socket.addEventListener('close', (event: CloseEvent) => {
      console.log(`TTS stream closed: ${event.code} ${event.reason}`);
      this.cleanupSocket();
      this.setConnectionState('disconnected');
      this.emit(EVENT_TTS_DISCONNECTED, { code: event.code, reason: event.reason });
    }, { once: true });
  }

  private handleSocketMessage(raw: unknown): void {
    try {
      if (typeof raw !== 'string') {
        throw new Error('Unexpected binary message');
      }

      const message: TtsServerMessage = JSON.parse(raw);

      handleReceivedTtsData(this, message);
      this.emit(EVENT_TTS_MESSAGE_RECEIVED, { payload: message });
    } catch (error) {
      console.error('❌ Failed to parse TTS message:', error, 'Raw payload:', raw);
    }
  }

  private setConnectionState(state: TtsConnectionState): void {
    if (this.connectionState === state) return;
    this.connectionState = state;
    this.emit(EVENT_TTS_CONNECTION_STATE_CHANGED, state);
  }

  private cleanupSocket(): void {
    this.socket = null;
    this.lastSentAt = 0;
    this.clearSendQueue();
  }

  getSocket(): WebSocket | null {
    return this.socket;
  }

  getConnectionState(): TtsConnectionState {
    return this.connectionState;
  }

  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }
}
