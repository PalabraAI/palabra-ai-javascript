import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PalabraTtsWebSocketTransport } from '../transport/PalabraTtsWebSocketTransport';
import {
  EVENT_TTS_AUDIO_CHUNK_RECEIVED,
  EVENT_TTS_CONNECTED,
  EVENT_TTS_CONNECTION_STATE_CHANGED,
  EVENT_TTS_DISCONNECTED,
  EVENT_TTS_ERROR_RECEIVED,
  EVENT_TTS_MESSAGE_RECEIVED,
} from '../transport/PalabraTtsWebSocketTransport.model';
import { TtsConfigManager } from '../tts/TtsConfigManager';
import { TTS_STREAM_PATH, TTS_WS_BASE_URL_EU } from '../tts/TtsDefaults';
import { TtsClientMessage } from '../tts/TtsConfig.model';

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
  sent: string[] = [];

  private listeners = new Map<string, ((event: unknown) => void)[]>();

  constructor(public url: string) {
    MockWebSocket.instances.push(this);
  }

  addEventListener(type: string, handler: (event: unknown) => void) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), handler]);
  }

  send(data: string) {
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

  parsedSent(): TtsClientMessage[] {
    return this.sent.map(message => JSON.parse(message));
  }
}

const createTransport = (connectionTimeoutMs?: number) => new PalabraTtsWebSocketTransport({
  streamUrl: `${TTS_WS_BASE_URL_EU}${TTS_STREAM_PATH}`,
  token: 'test-api-key',
  configManager: new TtsConfigManager({ language: 'en' }),
  connectionTimeoutMs,
});

const connect = async (transport: PalabraTtsWebSocketTransport) => {
  const connecting = transport.connect();
  MockWebSocket.last().simulateOpen();
  await connecting;
  return MockWebSocket.last();
};

describe('PalabraTtsWebSocketTransport', () => {
  beforeEach(() => {
    MockWebSocket.instances = [];
    (globalThis as unknown as { WebSocket: typeof MockWebSocket }).WebSocket = MockWebSocket;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('puts the token into the stream url', async () => {
    const socket = await connect(createTransport());

    expect(socket.url).toBe(`${TTS_WS_BASE_URL_EU}${TTS_STREAM_PATH}?token=test-api-key`);
  });

  it('sends the init message and reports the connection', async () => {
    const transport = createTransport();
    const onConnected = vi.fn();
    const onStateChanged = vi.fn();

    transport.on(EVENT_TTS_CONNECTED, onConnected);
    transport.on(EVENT_TTS_CONNECTION_STATE_CHANGED, onStateChanged);

    const socket = await connect(transport);

    expect(socket.parsedSent()).toEqual([{
      type: 'init',
      ...new TtsConfigManager({ language: 'en' }).getConfig(),
    }]);
    expect(onConnected).toHaveBeenCalledTimes(1);
    expect(onStateChanged.mock.calls.flat()).toEqual(['connecting', 'connected']);
    expect(transport.isConnected()).toBe(true);
    expect(transport.getConnectionState()).toBe('connected');
  });

  it('fails when the socket can not be opened', async () => {
    const transport = createTransport();
    const connecting = transport.connect();

    MockWebSocket.last().dispatch('error');

    await expect(connecting).rejects.toThrow('Failed to connect to the TTS stream');
    expect(transport.getConnectionState()).toBe('disconnected');
    expect(transport.getSocket()).toBeNull();
  });

  it('fails when the connection times out', async () => {
    vi.useFakeTimers();

    const transport = createTransport(50);
    const connecting = transport.connect();

    vi.advanceTimersByTime(50);

    await expect(connecting).rejects.toThrow('Connection to the TTS stream timed out after 50ms');
  });

  it('streams text chunks', async () => {
    const transport = createTransport();
    const socket = await connect(transport);

    await transport.sendText('Hello', { generationId: 'gen-1' });
    await transport.sendText('there', { generationId: 'gen-1', isEos: true });

    expect(socket.parsedSent().slice(1)).toEqual([
      { type: 'text', text: 'Hello', is_eos: false, generation_id: 'gen-1' },
      { type: 'text', text: 'there', is_eos: true, generation_id: 'gen-1' },
    ]);
  });

  it('rejects text chunks longer than the api limit', async () => {
    const transport = createTransport();
    await connect(transport);

    await expect(transport.sendText('a'.repeat(1025))).rejects.toThrow('Text chunk is too long');
  });

  it('does not send anything without a connection', async () => {
    const transport = createTransport();

    await expect(transport.sendText('Hello')).rejects.toThrow('TTS stream is not connected');
  });

  it('keeps sending after a failed message', async () => {
    const transport = createTransport();
    const socket = await connect(transport);

    await expect(transport.sendText('a'.repeat(1025))).rejects.toThrow('Text chunk is too long');
    await transport.sendText('Hello');

    expect(socket.parsedSent().slice(1)).toEqual([{ type: 'text', text: 'Hello', is_eos: false }]);
  });

  it('cancels the ongoing synthesis', async () => {
    const transport = createTransport();
    const socket = await connect(transport);

    await transport.cancel();

    expect(socket.parsedSent().slice(1)).toEqual([{ type: 'cancel' }]);
  });

  it('sends the cancel ahead of the queued text and drops it', async () => {
    const transport = createTransport();
    const socket = await connect(transport);

    const queued = [transport.sendText('one'), transport.sendText('two')];

    await transport.cancel();
    await Promise.all(queued);

    expect(socket.parsedSent().map(message => message.type)).toEqual(['init', 'cancel']);
  });

  it('keeps sending after the queue was cleared', async () => {
    const transport = createTransport();
    const socket = await connect(transport);

    transport.sendText('dropped');
    transport.clearSendQueue();
    await transport.sendText('sent');

    expect(socket.parsedSent().slice(1)).toEqual([{ type: 'text', text: 'sent', is_eos: false }]);
  });

  it('does not send the cancel without a connection', async () => {
    const transport = createTransport();

    await expect(transport.cancel()).resolves.toBeUndefined();
  });

  it('emits audio chunks and errors received from the api', async () => {
    const transport = createTransport();
    const socket = await connect(transport);

    const onChunk = vi.fn();
    const onError = vi.fn();
    const onMessage = vi.fn();

    transport.on(EVENT_TTS_AUDIO_CHUNK_RECEIVED, onChunk);
    transport.on(EVENT_TTS_ERROR_RECEIVED, onError);
    transport.on(EVENT_TTS_MESSAGE_RECEIVED, onMessage);

    const chunk = {
      audio: 'AAAA',
      size: 4,
      generation_id: 'gen-1',
      last_chunk: false,
      chunk_generation_delta: 120,
      audio_len: 0.2,
    };

    socket.simulateMessage({ message_type: 'audio_chunk', data: chunk });
    socket.simulateMessage({ message_type: 'error', data: { code: 'RATE_LIMIT_EXCEEDED', desc: 'too fast' } });

    expect(onChunk).toHaveBeenCalledWith(chunk);
    expect(onError).toHaveBeenCalledWith({ code: 'RATE_LIMIT_EXCEEDED', desc: 'too fast' });
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

    transport.on(EVENT_TTS_DISCONNECTED, onDisconnected);

    socket.close(1008, 'rate limit');

    expect(onDisconnected).toHaveBeenCalledWith({ code: 1008, reason: 'rate limit' });
    expect(transport.getConnectionState()).toBe('disconnected');
    expect(transport.getSocket()).toBeNull();
  });

  it('closes the socket on disconnect', async () => {
    const transport = createTransport();
    const socket = await connect(transport);

    await transport.disconnect();

    expect(socket.readyState).toBe(MockWebSocket.CLOSED);
    expect(transport.getConnectionState()).toBe('disconnected');
  });

  it('disconnects without a socket', async () => {
    const transport = createTransport();

    await transport.disconnect();

    expect(transport.getConnectionState()).toBe('disconnected');
  });
});
