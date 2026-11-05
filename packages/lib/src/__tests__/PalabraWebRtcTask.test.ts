import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RemoteParticipant, RoomEvent } from 'livekit-client';
import { PalabraWebRtcTransport } from '../transport/PalabraWebRtcTransport';
import { PipelineConfigManager } from '../config/PipelineConfigManager';

vi.mock('livekit-client', async () => {
  const actual = await vi.importActual<typeof import('livekit-client')>('livekit-client');
  const { EventEmitter } = await import('events');
  return {
    ...actual,
    Room: class extends EventEmitter {
      state = 'connected';
      remoteParticipants = new Map();
      localParticipant = {
        publishTrack: vi.fn().mockResolvedValue(undefined),
        publishData: vi.fn().mockResolvedValue(undefined),
      };
      prepareConnection() { /* no network preflight */ }
      async connect() { /* already connected fake room */ }
      async disconnect() { this.state = 'disconnected'; this.emit(actual.RoomEvent.Disconnected); }
    },
    LocalAudioTrack: class { constructor(public mediaStreamTrack: MediaStreamTrack) {} },
  };
});

const translator = { identity: 'palabra_translator_test', sid: 'translator' } as RemoteParticipant;
const listener = { identity: 'listener', sid: 'listener' } as RemoteParticipant;
const config = () => new PipelineConfigManager().setSourceLanguage('en').getConfig();
const observe = (promise: Promise<unknown>) => {
  const result = { done: false, error: undefined as Error | undefined };
  void promise.then(() => { result.done = true; }, error => { result.done = true; result.error = error; });
  return result;
};

describe('WebRTC task confirmation', () => {
  let transport: PalabraWebRtcTransport;
  beforeEach(() => {
    vi.useFakeTimers();
    transport = new PalabraWebRtcTransport({
      streamUrl: 'wss://test', accessToken: 'token', configManager: new PipelineConfigManager(),
      inputStream: { getAudioTracks: () => [{ kind: 'audio' }] } as unknown as MediaStream,
    });
  });
  afterEach(async () => {
    await transport.disconnect();
    vi.useRealTimers();
  });
  const tick = () => vi.advanceTimersByTimeAsync(0);
  const ack = (transport: PalabraWebRtcTransport, data: unknown = { command: 'set_task', task_status: 'running', event: 'unchanged' }, participant = translator, topic?: string, message_type = 'task_status') => {
    transport.getRoom().emit(RoomEvent.DataReceived, new Uint8Array(new TextEncoder().encode(JSON.stringify({ message_type, data }))), participant, undefined, topic);
  };
  const add = (transport: PalabraWebRtcTransport, participant = translator) => {
    transport.getRoom().remoteParticipants.set(participant.sid, participant);
    transport.getRoom().emit(RoomEvent.ParticipantConnected, participant);
  };

  it('waits for the translator, ignoring other participants and pre-send ACKs', async () => {
    const result = observe(transport.setTask(config()));
    ack(transport);
    add(transport, listener);
    await tick();
    expect(result.done).toBe(false);
    expect(transport.getRoom().localParticipant.publishData).not.toHaveBeenCalled();
    add(transport);
    await tick();
    expect(result.done).toBe(false);
    ack(transport);
    await tick();
    expect(result).toEqual({ done: true, error: undefined });
  });

  it('retries immutable settings reliably until an unchanged ACK, then removes listeners and timers', async () => {
    add(transport);
    const room = transport.getRoom();
    const baseline = [RoomEvent.DataReceived, RoomEvent.ParticipantConnected, RoomEvent.Disconnected].map(event => room.listenerCount(event));
    const settings = config();
    const expected = JSON.stringify({ message_type: 'set_task', data: settings });
    const result = observe(transport.setTask(settings));
    await tick();
    settings.pipeline.transcription.source_language = 'es';
    await vi.advanceTimersByTimeAsync(1249);
    expect(room.localParticipant.publishData).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(room.localParticipant.publishData).toHaveBeenCalledTimes(2);
    for (const [payload, options] of vi.mocked(room.localParticipant.publishData).mock.calls) {
      expect(new TextDecoder().decode(payload)).toBe(expected);
      expect(options).toEqual({ reliable: true });
    }
    ack(transport);
    await tick();
    expect(result).toEqual({ done: true, error: undefined });
    expect(vi.getTimerCount()).toBe(0);
    expect([RoomEvent.DataReceived, RoomEvent.ParticipantConnected, RoomEvent.Disconnected].map(event => room.listenerCount(event))).toEqual(baseline);
    await vi.advanceTimersByTimeAsync(10000);
    expect(room.localParticipant.publishData).toHaveBeenCalledTimes(2);
  });

  it('registers the ACK handler before an immediately responding publish', async () => {
    add(transport);
    vi.mocked(transport.getRoom().localParticipant.publishData).mockImplementation(async () => { ack(transport); });
    await expect(transport.setTask(config())).resolves.toBeUndefined();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('ignores malformed data, unrelated participants, topics, commands and statuses', async () => {
    add(transport);
    const result = observe(transport.setTask(config()));
    await tick();
    transport.getRoom().emit(RoomEvent.DataReceived, new Uint8Array(new TextEncoder().encode('null')), translator);
    transport.getRoom().emit(RoomEvent.DataReceived, new Uint8Array(new TextEncoder().encode('invalid')), translator);
    ack(transport, undefined, listener);
    ack(transport, undefined, translator, 'other');
    ack(transport, { command: 'get_task', task_status: 'running' });
    ack(transport, { command: 'set_task', task_status: 'paused' });
    ack(transport, { command: 'set_task', task_status: 'running' }, translator, undefined, 'current_task');
    await tick();
    expect(result.done).toBe(false);
    ack(transport);
    await tick();
    expect(result.error).toBeUndefined();
    expect(result.done).toBe(true);
  });

  it.each(['started', 'updated', 'unchanged', 'resumed'])('accepts running ACK with event %s', async event => {
    add(transport);
    const task = transport.setTask(config());
    await tick();
    ack(transport, { command: 'set_task', task_status: 'running', event });
    await expect(task).resolves.toBeUndefined();
  });

  it('retries after a rejected publish and caps backoff at five seconds', async () => {
    add(transport);
    const times: number[] = [];
    vi.mocked(transport.getRoom().localParticipant.publishData).mockImplementation(async () => {
      times.push(Date.now());
      if (times.length === 1) throw new Error('transient send failure');
    });
    const result = observe(transport.setTask(config()));
    await vi.advanceTimersByTimeAsync(20000);
    expect(times.map(time => time - times[0])).toEqual([0, 1250, 3125, 5937, 10155, 15155]);
    expect(result.done).toBe(false);
    ack(transport);
    await tick();
    expect(result.error).toBeUndefined();
  });

  it.each([false, true])('times out after 30s, including translator readiness (present=%s)', async present => {
    if (present) add(transport);
    const result = observe(transport.setTask(config()));
    await vi.advanceTimersByTimeAsync(29999);
    expect(result.done).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(result.error?.message).toMatch(/timed out/i);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('times out even when publishData never resolves, with no retries after settlement', async () => {
    add(transport);
    let complete: () => void;
    vi.mocked(transport.getRoom().localParticipant.publishData).mockImplementationOnce(() => new Promise<void>(resolve => { complete = resolve; }));
    const result = observe(transport.setTask(config()));
    await vi.advanceTimersByTimeAsync(30000);
    expect(result.error?.message).toMatch(/timed out/i);
    complete();
    await tick();
    expect(vi.getTimerCount()).toBe(0);
    expect(transport.getRoom().localParticipant.publishData).toHaveBeenCalledTimes(1);
  });

  it('stops on a translator error and ignores errors from other participants', async () => {
    add(transport);
    const result = observe(transport.setTask(config()));
    await tick();
    ack(transport, { code: 'invalid_settings' }, listener, undefined, 'error');
    await tick();
    expect(result.done).toBe(false);
    ack(transport, { code: 'invalid_settings' }, translator, undefined, 'error');
    await tick();
    expect(result.error?.message).toContain('invalid_settings');
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(['pauseTask', 'endTask', 'disconnect'] as const)('cancels pending task before %s and never resends it', async method => {
    add(transport);
    const result = observe(transport.setTask(config()));
    await tick();
    const stopping = transport[method]();
    await tick();
    expect(result.error?.name).toBe('AbortError');
    await stopping;
    const count = vi.mocked(transport.getRoom().localParticipant.publishData).mock.calls.length;
    await vi.advanceTimersByTimeAsync(10000);
    expect(transport.getRoom().localParticipant.publishData).toHaveBeenCalledTimes(count);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('rejects and cleans up on a remote disconnection', async () => {
    const result = observe(transport.setTask(config()));
    transport.getRoom().emit(RoomEvent.Disconnected);
    await tick();
    expect(result.error).toBeDefined();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('serializes immutable settings so the first ACK cannot confirm an unsent update', async () => {
    add(transport);
    const first = observe(transport.setTask(config()));
    await tick();
    const settings = config();
    settings.pipeline.transcription.source_language = 'es';
    const second = observe(transport.setTask(settings));
    settings.pipeline.transcription.source_language = 'fr';
    await tick();
    expect(first.done).toBe(false);
    expect(second.done).toBe(false);
    expect(transport.getRoom().localParticipant.publishData).toHaveBeenCalledTimes(1);
    ack(transport);
    await tick();
    expect(first).toEqual({ done: true, error: undefined });
    expect(second.done).toBe(false);
    const commands = vi.mocked(transport.getRoom().localParticipant.publishData).mock.calls.map(([payload]) => JSON.parse(new TextDecoder().decode(payload)));
    expect(commands.map(command => command.data.pipeline.transcription.source_language)).toEqual(['en', 'es']);
    ack(transport);
    await tick();
    expect(second).toEqual({ done: true, error: undefined });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not accept an ACK while publication is pending or if that publication rejects', async () => {
    add(transport);
    let fail: (error: Error) => void;
    vi.mocked(transport.getRoom().localParticipant.publishData).mockImplementationOnce(() => new Promise<void>((_resolve, reject) => { fail = reject; }));
    const result = observe(transport.setTask(config()));
    await tick();
    ack(transport);
    await tick();
    expect(result.done).toBe(false);
    fail(new Error('not delivered'));
    await tick();
    expect(result.done).toBe(false);
    await vi.advanceTimersByTimeAsync(1250);
    expect(transport.getRoom().localParticipant.publishData).toHaveBeenCalledTimes(2);
    expect(result.done).toBe(false);
    ack(transport);
    await tick();
    expect(result).toEqual({ done: true, error: undefined });
  });

  it('closes the room after two seconds even when end_task cannot be sent', async () => {
    vi.mocked(transport.getRoom().localParticipant.publishData).mockImplementationOnce(() => new Promise<void>(() => { /* blocked data channel */ }));
    const result = observe(transport.disconnect());
    await vi.advanceTimersByTimeAsync(2000);
    expect(result.done).toBe(true);
    expect(transport.getRoom().state).toBe('disconnected');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cancels queued settings on stop without publishing them later', async () => {
    add(transport);
    const first = observe(transport.setTask(config()));
    const second = observe(transport.setTask(config()));
    await tick();
    await transport.disconnect();
    await tick();
    expect(first.error?.name).toBe('AbortError');
    expect(second.error?.name).toBe('AbortError');
    const commands = vi.mocked(transport.getRoom().localParticipant.publishData).mock.calls.map(([payload]) => JSON.parse(new TextDecoder().decode(payload)).message_type);
    expect(commands).toEqual(['set_task', 'end_task']);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not overlap a timed-out publication with a subsequent task', async () => {
    add(transport);
    let complete: () => void;
    vi.mocked(transport.getRoom().localParticipant.publishData).mockImplementationOnce(() => new Promise<void>(resolve => { complete = resolve; }));
    const first = observe(transport.setTask(config()));
    await vi.advanceTimersByTimeAsync(30000);
    expect(first.error?.message).toMatch(/timed out/i);
    const second = observe(transport.setTask(config()));
    await tick();
    expect(transport.getRoom().localParticipant.publishData).toHaveBeenCalledTimes(1);
    complete();
    await tick();
    expect(transport.getRoom().localParticipant.publishData).toHaveBeenCalledTimes(2);
    expect(second.done).toBe(false);
    ack(transport);
    await tick();
    expect(second).toEqual({ done: true, error: undefined });
  });

  it('waits for settings queued during startup before completing connect', async () => {
    add(transport);
    const startup = observe(transport.connect());
    await tick();
    const settings = config();
    settings.pipeline.transcription.source_language = 'es';
    const update = observe(transport.setTask(settings));
    ack(transport);
    await tick();
    expect(startup.done).toBe(false);
    expect(update.done).toBe(false);
    expect(transport.getRoom().localParticipant.publishData).toHaveBeenCalledTimes(2);
    ack(transport);
    await tick();
    expect(startup).toEqual({ done: true, error: undefined });
    expect(update).toEqual({ done: true, error: undefined });
  });

  it('invalidates queued updates after an active failure but allows an explicit retry', async () => {
    add(transport);
    const first = observe(transport.setTask(config()));
    const second = observe(transport.setTask(config()));
    await tick();
    ack(transport, { code: 'invalid_settings' }, translator, undefined, 'error');
    await tick();
    expect(first.error?.message).toContain('invalid_settings');
    expect(second.error?.name).toBe('AbortError');
    expect(transport.getRoom().localParticipant.publishData).toHaveBeenCalledTimes(1);
    const retry = observe(transport.setTask(config()));
    await tick();
    ack(transport);
    await tick();
    expect(retry).toEqual({ done: true, error: undefined });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not finish connect before the translator confirms startup', async () => {
    const result = observe(transport.connect());
    await tick();
    expect(transport.getRoom().localParticipant.publishTrack).toHaveBeenCalledOnce();
    expect(transport.getRoom().localParticipant.publishData).not.toHaveBeenCalled();
    expect(result.done).toBe(false);
    add(transport);
    await tick();
    ack(transport);
    await tick();
    expect(result).toEqual({ done: true, error: undefined });
  });
});
