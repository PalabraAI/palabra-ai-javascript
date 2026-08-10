import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PalabraAsrWebSocketTransport } from '../transport/PalabraAsrWebSocketTransport';
import {
  EVENT_ASR_CONNECTED,
  EVENT_ASR_CONNECTION_STATE_CHANGED,
  EVENT_ASR_DISCONNECTED,
  EVENT_ASR_MESSAGE_RECEIVED,
  EVENT_ASR_PARTIAL_TRANSCRIPTION_RECEIVED,
  EVENT_ASR_TRANSCRIPTION_RECEIVED,
} from '../transport/PalabraAsrWebSocketTransport.model';
import { AsrConfigManager } from '../asr/AsrConfigManager';
import { ASR_STREAM_PATH, ASR_WS_BASE_URL_EU } from '../asr/AsrDefaults';

class MockWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  static instances: MockWebSocket[] = [];

  static last(): MockWebSocket {
    return MockWebSocket.instances[MockWebSocket.instances.length - 1];
  }

  readyState = MockWebSocket.CONNECTING;
  binaryType = 'blob';
  sent: unknown[] = [];

  private listeners = new Map<string, ((event: unknown) => void)[]>();

  constructor(public url: string) {
    MockWebSocket.instances.push(this);
  }

  addEventListener(type: string, handler: (event: unknown) => void) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), handler]);
  }

  send(data: unknown) {
    this.sent.push(data);
  }

  close(code = 1000, reason = '') {
    this.readyState = MockWebSocket.CLOSED;
    this.dispatch('close', { code, reason });
  }

  dispatch(type: string, event: unknown = {}) {
    this.listeners.get(type)?.forEach(handler => handler(event));
  }

  simulateOpen() {
    this.readyState = MockWebSocket.OPEN;
    this.dispatch('open');
  }

  simulateMessage(payload: unknown) {
    this.dispatch('message', { data: typeof payload === 'string' ? payload : JSON.stringify(payload) });
  }
}

const createTransport = (configManager = new AsrConfigManager({ language: 'en', sample_rate: 48000 })) =>
  new PalabraAsrWebSocketTransport({
    streamUrl: `${ASR_WS_BASE_URL_EU}${ASR_STREAM_PATH}`,
    token: 'test-api-key',
    configManager,
  });

const connect = async (transport: PalabraAsrWebSocketTransport) => {
  const connecting = transport.connect();
  MockWebSocket.last().simulateOpen();
  await connecting;
  return MockWebSocket.last();
};

const transcription = (isEos: boolean) => ({
  message_type: 'transcription',
  transcription_id: 'transcription-1',
  language: 'en',
  is_eos: isEos,
  segment: { text: 'hello', start_time: 0, end_time: 0.5 },
});

describe('PalabraAsrWebSocketTransport', () => {
  beforeEach(() => {
    MockWebSocket.instances = [];
    (globalThis as unknown as { WebSocket: typeof MockWebSocket }).WebSocket = MockWebSocket;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('puts the whole config into the query', async () => {
    const configManager = new AsrConfigManager({ language: 'en', sample_rate: 48000 })
      .setTranslateLanguages(['es', 'de']);

    const socket = await connect(createTransport(configManager));
    const url = new URL(socket.url);

    expect(url.pathname).toBe(ASR_STREAM_PATH);
    expect(Object.fromEntries(url.searchParams)).toEqual({
      format: 'pcm_s16le',
      sample_rate: '48000',
      language: 'en',
      translate_languages: 'es,de',
      token: 'test-api-key',
    });
  });

  it('reports the connection', async () => {
    const transport = createTransport();
    const onConnected = vi.fn();
    const onStateChanged = vi.fn();

    transport.on(EVENT_ASR_CONNECTED, onConnected);
    transport.on(EVENT_ASR_CONNECTION_STATE_CHANGED, onStateChanged);

    const socket = await connect(transport);

    expect(socket.binaryType).toBe('arraybuffer');
    expect(onConnected).toHaveBeenCalledTimes(1);
    expect(onStateChanged.mock.calls.flat()).toEqual(['connecting', 'connected']);
    expect(transport.isConnected()).toBe(true);
  });

  it('explains the upgrade failures', async () => {
    const transport = createTransport();
    const connecting = transport.connect();

    MockWebSocket.last().dispatch('error');

    await expect(connecting).rejects.toThrow('409 when a session for this key is already active');
    expect(transport.getConnectionState()).toBe('disconnected');
  });

  it('sends audio as binary frames', async () => {
    const transport = createTransport();
    const socket = await connect(transport);

    const chunk = new ArrayBuffer(640);
    transport.sendAudio(chunk);

    expect(socket.sent).toEqual([chunk]);
  });

  it('does not send audio without a connection', () => {
    const transport = createTransport();

    expect(() => transport.sendAudio(new ArrayBuffer(8))).toThrow('STT stream is not connected');
  });

  it('splits partial and final transcriptions', async () => {
    const transport = createTransport();
    const socket = await connect(transport);

    const onPartial = vi.fn();
    const onFinal = vi.fn();
    const onMessage = vi.fn();

    transport.on(EVENT_ASR_PARTIAL_TRANSCRIPTION_RECEIVED, onPartial);
    transport.on(EVENT_ASR_TRANSCRIPTION_RECEIVED, onFinal);
    transport.on(EVENT_ASR_MESSAGE_RECEIVED, onMessage);

    socket.simulateMessage(transcription(false));
    socket.simulateMessage(transcription(true));

    expect(onPartial).toHaveBeenCalledWith(transcription(false));
    expect(onFinal).toHaveBeenCalledWith(transcription(true));
    expect(onMessage).toHaveBeenCalledTimes(2);
  });

  it('survives a broken message', async () => {
    const transport = createTransport();
    const socket = await connect(transport);
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    socket.simulateMessage('not a json');

    expect(consoleError).toHaveBeenCalled();
    expect(transport.isConnected()).toBe(true);

    consoleError.mockRestore();
  });

  it('reports a socket closed by the api', async () => {
    const transport = createTransport();
    const socket = await connect(transport);
    const onDisconnected = vi.fn();

    transport.on(EVENT_ASR_DISCONNECTED, onDisconnected);

    socket.close(1011, 'server error');

    expect(onDisconnected).toHaveBeenCalledWith({ code: 1011, reason: 'server error' });
    expect(transport.getSocket()).toBeNull();
  });

  it('closes the socket on disconnect', async () => {
    const transport = createTransport();
    const socket = await connect(transport);

    await transport.disconnect();

    expect(socket.readyState).toBe(MockWebSocket.CLOSED);
    expect(transport.getConnectionState()).toBe('disconnected');
  });
});
