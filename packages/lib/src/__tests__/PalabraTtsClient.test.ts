import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PalabraTtsClient } from '../tts/PalabraTtsClient';
import {
  EVENT_TTS_AUDIO_CHUNK_RECEIVED,
  EVENT_TTS_CONNECTION_STATE_CHANGED,
  EVENT_TTS_GENERATION_COMPLETED,
  EVENT_TTS_SESSION_STARTED,
  EVENT_TTS_SESSION_STOPPED,
} from '../transport/PalabraTtsWebSocketTransport.model';
import { TTS_MAX_TEXT_LENGTH, TTS_STREAM_PATH, TTS_WS_BASE_URL_EU, TTS_WS_BASE_URL_US } from '../tts/TtsDefaults';
import { PalabraTtsClientData } from '../tts/PalabraTtsClient.model';
import { TtsAudioChunkData } from '../utils/tts-data-filters.model';

const { MockTransport } = vi.hoisted(() => {
  interface MockTransportOptions {
    streamUrl: string;
    token: string;
  }

  class MockTransport {
    static instances: MockTransport[] = [];
    static failNextConnect = false;

    connect = vi.fn(async () => {
      if (MockTransport.failNextConnect) {
        MockTransport.failNextConnect = false;
        throw new Error('connection failed');
      }
      this.connected = true;
    });

    disconnect = vi.fn(async () => {
      this.connected = false;
    });

    sendText = vi.fn(async () => undefined);
    cancel = vi.fn(async () => undefined);

    private connected = false;
    private handlers = new Map<string, ((...args: unknown[]) => void)[]>();

    constructor(public options: MockTransportOptions) {
      MockTransport.instances.push(this);
    }

    on(event: string, handler: (...args: unknown[]) => void) {
      this.handlers.set(event, [...(this.handlers.get(event) ?? []), handler]);
      return this;
    }

    emit(event: string, ...args: unknown[]) {
      this.handlers.get(event)?.forEach(handler => handler(...args));
      return true;
    }

    isConnected() {
      return this.connected;
    }
  }

  return { MockTransport };
});

vi.mock('../transport/PalabraTtsWebSocketTransport', () => ({
  PalabraTtsWebSocketTransport: MockTransport,
}));

const transportOf = (client: PalabraTtsClient) => client.transport as unknown as InstanceType<typeof MockTransport>;

const audioChunk = (data: Partial<TtsAudioChunkData> = {}): TtsAudioChunkData => ({
  audio: 'AAAA',
  size: 4,
  generation_id: 'gen-1',
  last_chunk: false,
  chunk_generation_delta: 10,
  audio_len: 0.1,
  ...data,
});

const mockAudioContext = (sampleRate = 24000) => {
  const startedSources: { start: ReturnType<typeof vi.fn>, stop: ReturnType<typeof vi.fn> }[] = [];

  const audioContext = {
    currentTime: 0,
    sampleRate,
    destination: { id: 'output' },
    close: vi.fn(),
    createGain: vi.fn(() => ({ gain: { value: 1 }, connect: vi.fn(), disconnect: vi.fn() })),
    createMediaStreamDestination: vi.fn(() => ({
      stream: { getAudioTracks: () => [{ id: 'tts-track' }] },
      connect: vi.fn(),
      disconnect: vi.fn(),
    })),
    createBuffer: vi.fn((_channels: number, length: number, sampleRate: number) => ({
      duration: length / sampleRate,
      getChannelData: () => new Float32Array(length),
    })),
    createBufferSource: vi.fn(() => {
      const source = { buffer: null, onended: null, connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn() };
      startedSources.push(source);
      return source;
    }),
  } as unknown as AudioContext;

  return { audioContext, startedSources };
};

const createClient = (data: Partial<PalabraTtsClientData> = {}) => new PalabraTtsClient({
  auth: { apiKey: 'test-api-key' },
  language: 'en',
  ignoreAudioContext: true,
  ...data,
});

describe('PalabraTtsClient', () => {
  beforeEach(() => {
    MockTransport.instances = [];
    MockTransport.failNextConnect = false;
  });

  it('requires either auth or a session provider', () => {
    expect(() => new PalabraTtsClient({ language: 'en', ignoreAudioContext: true }))
      .toThrow('Either `auth` or `createSession` must be provided');
  });

  it('applies the constructor options to the config', () => {
    const client = createClient({
      language: 'ru',
      model: 'custom-model',
      voiceOptions: { voice_id: 'default_high', speed: 1.2 },
      output: { format: 'pcm', sample_rate: 16000 },
    });

    expect(client.getConfig()).toEqual({
      language: 'ru',
      model: 'custom-model',
      voice_options: { voice_id: 'default_high', speed: 1.2, deaccent_strength: 1.0 },
      output: { format: 'pcm', sample_rate: 16000 },
    });
  });

  it('asks the api for the rate the audio context actually runs at', async () => {
    const { audioContext } = mockAudioContext(48000);
    const client = createClient({ ignoreAudioContext: false, audioContext, output: { sample_rate: 24000 } });

    expect(client.getConfig().output.sample_rate).toBe(48000);

    await client.startSession();
    await client.startPlayback();

    transportOf(client).emit(EVENT_TTS_AUDIO_CHUNK_RECEIVED, audioChunk({ generation_id: await client.speak('Hi') }));

    expect(audioContext.createBuffer).toHaveBeenCalledWith(1, expect.any(Number), 48000);
  });

  it('keeps the configured sample rate when the audio context is not used', () => {
    const client = createClient({ ignoreAudioContext: true, output: { sample_rate: 16000 } });

    expect(client.getConfig().output.sample_rate).toBe(16000);
  });

  it('builds the stream url from the api key', async () => {
    const client = createClient();
    await client.startSession();

    expect(transportOf(client).options).toMatchObject({
      streamUrl: `${TTS_WS_BASE_URL_EU}${TTS_STREAM_PATH}`,
      token: 'test-api-key',
    });
  });

  it('supports another region', async () => {
    const client = createClient({ wsBaseUrl: TTS_WS_BASE_URL_US });
    await client.startSession();

    expect(transportOf(client).options.streamUrl).toBe(`${TTS_WS_BASE_URL_US}${TTS_STREAM_PATH}`);
  });

  it('takes the credentials from the session provider', async () => {
    const createSession = vi.fn().mockResolvedValue({ streamUrl: 'wss://custom/stream', token: 'session-token' });
    const client = new PalabraTtsClient({ createSession, language: 'en', ignoreAudioContext: true });

    await client.startSession();

    expect(createSession).toHaveBeenCalledTimes(1);
    expect(transportOf(client).options).toMatchObject({ streamUrl: 'wss://custom/stream', token: 'session-token' });
  });

  it('reports the started session', async () => {
    const client = createClient();
    const onSessionStarted = vi.fn();

    client.on(EVENT_TTS_SESSION_STARTED, onSessionStarted);

    await expect(client.startSession()).resolves.toBe(true);

    expect(transportOf(client).connect).toHaveBeenCalledTimes(1);
    expect(onSessionStarted).toHaveBeenCalledTimes(1);
    expect(client.getSessionStatus()).toBe('ongoing');
  });

  it('stops the session when the connection fails', async () => {
    const client = createClient();

    MockTransport.failNextConnect = true;

    await expect(client.startSession()).rejects.toThrow('connection failed');
    expect(client.getSessionStatus()).toBe('stopped');
    expect(client.transport).toBeNull();
  });

  it('stops the session', async () => {
    const client = createClient();
    const onSessionStopped = vi.fn();

    client.on(EVENT_TTS_SESSION_STOPPED, onSessionStopped);

    await client.startSession();
    const transport = transportOf(client);
    await client.stopSession();

    expect(transport.disconnect).toHaveBeenCalledTimes(1);
    expect(client.transport).toBeNull();
    expect(client.getSessionStatus()).toBe('stopped');
    expect(onSessionStopped).toHaveBeenCalledTimes(1);
  });

  it('speaks a short text as a single chunk', async () => {
    const client = createClient();
    await client.startSession();

    const generationId = await client.speak('Hello there');

    expect(transportOf(client).sendText).toHaveBeenCalledTimes(1);
    expect(transportOf(client).sendText).toHaveBeenCalledWith('Hello there', { generationId, isEos: true });
  });

  it('marks only the last chunk of a long text as the end of speech', async () => {
    const client = createClient();
    await client.startSession();

    await client.speak('palabra '.repeat(500), { generationId: 'gen-1' });

    const calls = transportOf(client).sendText.mock.calls as unknown as [string, { generationId: string, isEos: boolean }][];

    expect(calls.length).toBeGreaterThan(1);
    calls.forEach(([text, options], index) => {
      expect(text.length).toBeLessThanOrEqual(TTS_MAX_TEXT_LENGTH);
      expect(options).toEqual({ generationId: 'gen-1', isEos: index === calls.length - 1 });
    });
  });

  it('keeps the generation open when the text is streamed in parts', async () => {
    const client = createClient();
    await client.startSession();

    const generationId = await client.speak('First part', { isEos: false });
    await client.speak('and the last one', { generationId });

    expect(transportOf(client).sendText.mock.calls).toEqual([
      ['First part', { generationId, isEos: false }],
      ['and the last one', { generationId, isEos: true }],
    ]);
  });

  it('does not speak without a session', async () => {
    const client = createClient();

    await expect(client.speak('Hello')).rejects.toThrow('TTS session is not started');
  });

  it('does not speak an empty text', async () => {
    const client = createClient();
    await client.startSession();

    await expect(client.speak('   ')).rejects.toThrow('Nothing to synthesize');
  });

  it('cancels the ongoing synthesis', async () => {
    const client = createClient();
    await client.startSession();

    await client.cancel();

    expect(transportOf(client).cancel).toHaveBeenCalledTimes(1);
  });

  it('clears the scheduled audio before the cancel reaches the api', async () => {
    const { audioContext, startedSources } = mockAudioContext();
    const order: string[] = [];

    const client = createClient({ ignoreAudioContext: false, audioContext });
    await client.startSession();
    await client.startPlayback();

    const generationId = await client.speak('Hello there');
    transportOf(client).emit(EVENT_TTS_AUDIO_CHUNK_RECEIVED, audioChunk({ generation_id: generationId }));

    expect(startedSources.length).toBe(1);

    startedSources[0].stop.mockImplementation(() => order.push('stop'));
    transportOf(client).cancel.mockImplementation(async () => {
      order.push('cancel');
    });

    await client.cancel();

    expect(order).toEqual(['stop', 'cancel']);
  });

  it('ignores the chunks of a cancelled generation', async () => {
    const { audioContext, startedSources } = mockAudioContext();

    const client = createClient({ ignoreAudioContext: false, audioContext });
    await client.startSession();

    const generationId = await client.speak('Hello there');
    await client.cancel();

    transportOf(client).emit(EVENT_TTS_AUDIO_CHUNK_RECEIVED, audioChunk({ generation_id: generationId }));

    expect(startedSources.length).toBe(0);
  });

  it('stops sending the remaining chunks of a cancelled text', async () => {
    const client = createClient();
    await client.startSession();

    const transport = transportOf(client);

    transport.sendText.mockImplementation(async () => {
      await client.cancel();
    });

    await client.speak('palabra '.repeat(500));

    expect(transport.sendText).toHaveBeenCalledTimes(1);
  });

  it('re-emits the transport events and reports finished generations', async () => {
    const client = createClient();
    await client.startSession();

    const onChunk = vi.fn();
    const onGenerationCompleted = vi.fn();
    const onStateChanged = vi.fn();

    client.on(EVENT_TTS_AUDIO_CHUNK_RECEIVED, onChunk);
    client.on(EVENT_TTS_GENERATION_COMPLETED, onGenerationCompleted);
    client.on(EVENT_TTS_CONNECTION_STATE_CHANGED, onStateChanged);

    const transport = transportOf(client);

    await client.speak('Hello there', { generationId: 'gen-1' });

    transport.emit(EVENT_TTS_CONNECTION_STATE_CHANGED, 'connected');
    transport.emit(EVENT_TTS_AUDIO_CHUNK_RECEIVED, audioChunk());
    transport.emit(EVENT_TTS_AUDIO_CHUNK_RECEIVED, audioChunk({ last_chunk: true }));

    expect(onStateChanged).toHaveBeenCalledWith('connected');
    expect(client.getConnectionStatus()).toBe('connected');
    expect(onChunk).toHaveBeenCalledTimes(2);
    expect(onGenerationCompleted).toHaveBeenCalledWith({ generationId: 'gen-1' });
  });

  it('restarts an ongoing session when the voice settings change', async () => {
    const client = createClient();
    await client.startSession();

    const firstTransport = transportOf(client);

    await client.setVoiceOptions({ voice_id: 'default_high' });

    expect(firstTransport.disconnect).toHaveBeenCalledTimes(1);
    expect(MockTransport.instances.length).toBe(2);
    expect(client.getConfig().voice_options.voice_id).toBe('default_high');
    expect(client.getSessionStatus()).toBe('ongoing');
  });

  it('does not open a session when the settings change before the start', async () => {
    const client = createClient();

    await client.setLanguage('de');

    expect(MockTransport.instances.length).toBe(0);
    expect(client.getConfig().language).toBe('de');
  });

  it('plays pcm chunks through the speech track', async () => {
    const { audioContext, startedSources } = mockAudioContext();

    const client = createClient({ ignoreAudioContext: false, audioContext });
    await client.startSession();
    await client.startPlayback();

    expect(client.getSpeechTrack()).toEqual({ id: 'tts-track' });

    const generationId = await client.speak('Hello there');
    transportOf(client).emit(EVENT_TTS_AUDIO_CHUNK_RECEIVED, audioChunk({ generation_id: generationId }));

    expect(startedSources.length).toBe(1);

    client.setVolume(0.3);
    expect(client.getVolume()).toBe(0.3);

    await client.stopSession();
    expect(client.getSpeechTrack()).toBeNull();
  });

  it('skips the playback for formats that can not be streamed', async () => {
    const { audioContext, startedSources } = mockAudioContext();
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const client = createClient({ ignoreAudioContext: false, audioContext, output: { format: 'mp3' } });
    await client.startSession();

    const generationId = await client.speak('Hello there');
    transportOf(client).emit(EVENT_TTS_AUDIO_CHUNK_RECEIVED, audioChunk({ generation_id: generationId }));

    expect(client.getSpeechTrack()).toBeNull();
    expect(startedSources.length).toBe(0);
    expect(consoleWarn).toHaveBeenCalled();

    consoleWarn.mockRestore();
  });

  it('has no speech track while the audio context is ignored', async () => {
    const client = createClient();
    await client.startSession();

    expect(client.getSpeechTrack()).toBeNull();
    expect(client.getVolume()).toBe(1.0);

    client.setVolume(0.5);
    expect(client.getVolume()).toBe(0.5);
  });
});
