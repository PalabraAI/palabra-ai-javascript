import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PalabraAsrClient } from '../asr/PalabraAsrClient';
import {
  EVENT_ASR_CONNECTION_STATE_CHANGED,
  EVENT_ASR_PARTIAL_TRANSCRIPTION_RECEIVED,
  EVENT_ASR_SESSION_STARTED,
  EVENT_ASR_SESSION_STOPPED,
} from '../transport/PalabraAsrWebSocketTransport.model';
import { ASR_STREAM_PATH, ASR_WS_BASE_URL_EU, ASR_WS_BASE_URL_US } from '../asr/AsrDefaults';
import { PalabraAsrClientData } from '../asr/PalabraAsrClient.model';

const { MockTransport, MockCapture } = vi.hoisted(() => {
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

    sendAudio = vi.fn();

    private connected = false;
    private handlers = new Map<string, ((...args: unknown[]) => void)[]>();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(public options: any) {
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

  class MockCapture {
    static instances: MockCapture[] = [];

    start = vi.fn(async (track: MediaStreamTrack) => {
      this.track = track;
    });

    stop = vi.fn();

    track: MediaStreamTrack | null = null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(public audioContext: any, public options: any) {
      MockCapture.instances.push(this);
    }

    emitChunk(chunk: ArrayBuffer) {
      this.options.onChunk(chunk);
    }
  }

  return { MockTransport, MockCapture };
});

vi.mock('../transport/PalabraAsrWebSocketTransport', () => ({
  PalabraAsrWebSocketTransport: MockTransport,
}));

vi.mock('../utils/AsrAudioCapture', () => ({
  AsrAudioCapture: MockCapture,
}));

const transportOf = (client: PalabraAsrClient) => client.transport as unknown as InstanceType<typeof MockTransport>;
const captureOf = () => MockCapture.instances[MockCapture.instances.length - 1];

const audioContext = {
  sampleRate: 48000,
  state: 'suspended',
  resume: vi.fn(async () => {
    (audioContext as unknown as { state: string }).state = 'running';
  }),
  close: vi.fn(),
} as unknown as AudioContext;

const track = { id: 'mic-track', enabled: true, stop: vi.fn() } as unknown as MediaStreamTrack;

const createClient = (data: Partial<PalabraAsrClientData> = {}) => new PalabraAsrClient({
  auth: { apiKey: 'test-api-key' },
  handleOriginalTrack: async () => track,
  audioContext,
  ...data,
});

describe('PalabraAsrClient', () => {
  beforeEach(() => {
    MockTransport.instances = [];
    MockTransport.failNextConnect = false;
    MockCapture.instances = [];
    (audioContext as unknown as { state: string }).state = 'suspended';
    (track as unknown as { enabled: boolean }).enabled = true;
    vi.clearAllMocks();
  });

  it('requires either auth or a session provider', () => {
    expect(() => new PalabraAsrClient({ handleOriginalTrack: async () => track }))
      .toThrow('Either `auth` or `createSession` must be provided');
  });

  it('starts the session and the capture', async () => {
    const client = createClient({ language: 'en', translateLanguages: ['es'] });
    const onSessionStarted = vi.fn();

    client.on(EVENT_ASR_SESSION_STARTED, onSessionStarted);

    await expect(client.startTranscription()).resolves.toBe(true);

    expect(transportOf(client).options).toMatchObject({
      streamUrl: `${ASR_WS_BASE_URL_EU}${ASR_STREAM_PATH}`,
      token: 'test-api-key',
    });
    expect(transportOf(client).connect).toHaveBeenCalledTimes(1);
    expect(captureOf().start).toHaveBeenCalledWith(track);
    expect(onSessionStarted).toHaveBeenCalledTimes(1);
    expect(client.getSessionStatus()).toBe('ongoing');
  });

  it('resumes the audio context and declares its sample rate', async () => {
    const client = createClient();

    await client.startTranscription();

    expect(audioContext.resume).toHaveBeenCalledTimes(1);
    expect(client.getConfig().sample_rate).toBe(48000);
  });

  it('supports another region', async () => {
    const client = createClient({ wsBaseUrl: ASR_WS_BASE_URL_US });
    await client.startTranscription();

    expect(transportOf(client).options.streamUrl).toBe(`${ASR_WS_BASE_URL_US}${ASR_STREAM_PATH}`);
  });

  it('takes the credentials from the session provider', async () => {
    const createSession = vi.fn().mockResolvedValue({ streamUrl: 'wss://custom/stt', token: 'session-token' });
    const client = createClient({ auth: undefined, createSession });

    await client.startTranscription();

    expect(createSession).toHaveBeenCalledTimes(1);
    expect(transportOf(client).options).toMatchObject({ streamUrl: 'wss://custom/stt', token: 'session-token' });
  });

  it('streams the captured chunks', async () => {
    const client = createClient();
    await client.startTranscription();

    const chunk = new ArrayBuffer(1920);
    captureOf().emitChunk(chunk);

    expect(transportOf(client).sendAudio).toHaveBeenCalledWith(chunk);
  });

  it('drops the chunks captured after the disconnect', async () => {
    const client = createClient();
    await client.startTranscription();

    const capture = captureOf();
    const transport = transportOf(client);

    await transport.disconnect();
    capture.emitChunk(new ArrayBuffer(1920));

    expect(transport.sendAudio).not.toHaveBeenCalled();
  });

  it('stops the capture, the socket and the track', async () => {
    const client = createClient();
    const onSessionStopped = vi.fn();

    client.on(EVENT_ASR_SESSION_STOPPED, onSessionStopped);

    await client.startTranscription();

    const capture = captureOf();
    const transport = transportOf(client);

    await client.stopTranscription();

    expect(capture.stop).toHaveBeenCalledTimes(1);
    expect(transport.disconnect).toHaveBeenCalledTimes(1);
    expect(track.stop).toHaveBeenCalledTimes(1);
    expect(client.transport).toBeNull();
    expect(client.getSessionStatus()).toBe('stopped');
    expect(onSessionStopped).toHaveBeenCalledTimes(1);
  });

  it('mutes and unmutes the track', async () => {
    const client = createClient();
    await client.startTranscription();

    client.muteOriginalTrack();
    expect(client.isOriginalTrackMuted()).toBe(true);

    client.unmuteOriginalTrack();
    expect(client.isOriginalTrackMuted()).toBe(false);
  });

  it('re-emits the transport events', async () => {
    const client = createClient();
    await client.startTranscription();

    const onPartial = vi.fn();
    const onStateChanged = vi.fn();

    client.on(EVENT_ASR_PARTIAL_TRANSCRIPTION_RECEIVED, onPartial);
    client.on(EVENT_ASR_CONNECTION_STATE_CHANGED, onStateChanged);

    const payload = {
      message_type: 'transcription',
      transcription_id: 'transcription-1',
      language: 'en',
      is_eos: false,
      segment: { text: 'hello', start_time: 0, end_time: 0.5 },
    };

    transportOf(client).emit(EVENT_ASR_PARTIAL_TRANSCRIPTION_RECEIVED, payload);
    transportOf(client).emit(EVENT_ASR_CONNECTION_STATE_CHANGED, 'connected');

    expect(onPartial).toHaveBeenCalledWith(payload);
    expect(client.getConnectionStatus()).toBe('connected');
    expect(onStateChanged).toHaveBeenCalledWith('connected');
  });

  it('restarts an ongoing session when the language changes', async () => {
    const client = createClient();
    await client.startTranscription();

    const firstTransport = transportOf(client);

    await client.setLanguage('de');

    expect(firstTransport.disconnect).toHaveBeenCalledTimes(1);
    expect(MockTransport.instances.length).toBe(2);
    expect(client.getConfig().language).toBe('de');
    expect(client.getSessionStatus()).toBe('ongoing');
  });

  it('does not open a session when the language changes before the start', async () => {
    const client = createClient();

    await client.setTranslateLanguages(['fr']);

    expect(MockTransport.instances.length).toBe(0);
    expect(client.getConfig().translate_languages).toEqual(['fr']);
  });

  it('stops the session when the connection fails', async () => {
    const client = createClient();

    MockTransport.failNextConnect = true;

    await expect(client.startTranscription()).rejects.toThrow('connection failed');
    expect(client.getSessionStatus()).toBe('stopped');
    expect(client.transport).toBeNull();
  });
});
