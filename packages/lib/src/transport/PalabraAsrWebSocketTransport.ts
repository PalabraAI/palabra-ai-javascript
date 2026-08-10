import { RealtimeTransport } from '~/transport/RealtimeTransport.model';
import {
  AsrConnectionState,
  EVENT_ASR_CONNECTED,
  EVENT_ASR_CONNECTION_STATE_CHANGED,
  EVENT_ASR_DISCONNECTED,
  EVENT_ASR_ERROR_RECEIVED,
  EVENT_ASR_MESSAGE_RECEIVED,
  PalabraAsrWebSocketTransportConstructor,
} from '~/transport/PalabraAsrWebSocketTransport.model';
import { PalabraAsrBaseEventEmitter } from '~/PalabraAsrBaseEventEmitter';
import { AsrConfigManager } from '~/asr/AsrConfigManager';
import { ASR_CONNECTION_TIMEOUT_MS } from '~/asr/AsrDefaults';
import { handleReceivedAsrData } from '~/utils/asr-data-filters';
import { AsrServerMessage } from '~/utils/asr-data-filters.model';

export class PalabraAsrWebSocketTransport extends PalabraAsrBaseEventEmitter implements RealtimeTransport {
  private readonly streamUrl: string;
  private readonly token: string;
  private readonly connectionTimeoutMs: number;
  private configManager: AsrConfigManager;
  private socket: WebSocket | null = null;
  private connectionState: AsrConnectionState = 'init';

  constructor(data: PalabraAsrWebSocketTransportConstructor) {
    super();

    this.streamUrl = data.streamUrl;
    this.token = data.token;
    this.configManager = data.configManager;
    this.connectionTimeoutMs = data.connectionTimeoutMs ?? ASR_CONNECTION_TIMEOUT_MS;
  }

  async connect(): Promise<void> {
    if (this.socket) return;

    try {
      console.log('✅ Connecting to the STT stream... ' + this.streamUrl);

      this.setConnectionState('connecting');

      this.socket = await this.openSocket();

      this.setConnectionState('connected');
      this.emit(EVENT_ASR_CONNECTED);

      console.log('✅ Successfully connected to the STT stream');
    } catch (error) {
      console.error('❌ Failed to connect to the STT stream:', error);
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

  sendAudio(chunk: BufferSource): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error('STT stream is not connected');
    }

    this.socket.send(chunk);
  }

  private buildUrl(): string {
    const url = new URL(this.streamUrl);

    Object.entries(this.configManager.getQueryParams()).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });

    url.searchParams.set('token', this.token);

    return url.toString();
  }

  private openSocket(): Promise<WebSocket> {
    return new Promise<WebSocket>((resolve, reject) => {
      const socket = new WebSocket(this.buildUrl());
      let isSettled = false;

      socket.binaryType = 'arraybuffer';

      const timeoutId = setTimeout(() => {
        isSettled = true;
        socket.close();
        reject(new Error(`Connection to the STT stream timed out after ${this.connectionTimeoutMs}ms`));
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
        reject(new Error('Failed to connect to the STT stream. The API answers 401 for a wrong key and 409 when a session for this key is already active'));
      }, { once: true });
    });
  }

  private setupSocketHandlers(socket: WebSocket): void {
    socket.addEventListener('message', (event: MessageEvent) => {
      this.handleSocketMessage(event.data);
    });

    socket.addEventListener('error', () => {
      console.error('❌ STT stream error');
      this.emit(EVENT_ASR_ERROR_RECEIVED, new Error('STT stream error'));
    });

    socket.addEventListener('close', (event: CloseEvent) => {
      console.log(`STT stream closed: ${event.code} ${event.reason}`);
      this.cleanupSocket();
      this.setConnectionState('disconnected');
      this.emit(EVENT_ASR_DISCONNECTED, { code: event.code, reason: event.reason });
    }, { once: true });
  }

  private handleSocketMessage(raw: unknown): void {
    try {
      if (typeof raw !== 'string') {
        throw new Error('Unexpected binary message');
      }

      const message: AsrServerMessage = JSON.parse(raw);

      handleReceivedAsrData(this, message);
      this.emit(EVENT_ASR_MESSAGE_RECEIVED, { payload: message });
    } catch (error) {
      console.error('❌ Failed to parse STT message:', error, 'Raw payload:', raw);
    }
  }

  private setConnectionState(state: AsrConnectionState): void {
    if (this.connectionState === state) return;
    this.connectionState = state;
    this.emit(EVENT_ASR_CONNECTION_STATE_CHANGED, state);
  }

  private cleanupSocket(): void {
    this.socket = null;
  }

  getSocket(): WebSocket | null {
    return this.socket;
  }

  getConnectionState(): AsrConnectionState {
    return this.connectionState;
  }

  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }
}
