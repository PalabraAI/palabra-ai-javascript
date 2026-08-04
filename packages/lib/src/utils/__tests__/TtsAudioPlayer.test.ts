import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TtsAudioPlayer } from '../TtsAudioPlayer';

interface MockSource {
  buffer: unknown;
  onended: (() => void) | null;
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
}

const pcmChunk = (samples: number[]) => {
  const bytes = new Uint8Array(samples.length * 2);
  const view = new DataView(bytes.buffer);
  samples.forEach((sample, index) => view.setInt16(index * 2, sample, true));
  return Buffer.from(bytes).toString('base64');
};

const rawChunk = (bytes: number[]) => Buffer.from(new Uint8Array(bytes)).toString('base64');

let sources: MockSource[] = [];
let channels: Float32Array[] = [];
let gainNode: { gain: { value: number }, connect: ReturnType<typeof vi.fn>, disconnect: ReturnType<typeof vi.fn> };
let speechTrack: { id: string };

const createMockAudioContext = () => {
  gainNode = {
    gain: { value: 1 },
    connect: vi.fn(),
    disconnect: vi.fn(),
  };

  speechTrack = { id: 'tts-track' };

  return {
    currentTime: 0,
    destination: { id: 'output' },
    createGain: vi.fn(() => gainNode),
    createMediaStreamDestination: vi.fn(() => ({
      stream: { getAudioTracks: () => [speechTrack] },
      connect: vi.fn(),
      disconnect: vi.fn(),
    })),
    createBuffer: vi.fn((_channels: number, length: number, sampleRate: number) => {
      const channel = new Float32Array(length);
      channels.push(channel);

      return { duration: length / sampleRate, getChannelData: () => channel };
    }),
    createBufferSource: vi.fn(() => {
      const source: MockSource = {
        buffer: null,
        onended: null,
        connect: vi.fn(),
        disconnect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      };
      sources.push(source);
      return source;
    }),
  } as unknown as AudioContext;
};

describe('TtsAudioPlayer', () => {
  let audioContext: AudioContext;
  let onPlaybackStart: ReturnType<typeof vi.fn>;
  let onPlaybackEnd: ReturnType<typeof vi.fn>;
  let player: TtsAudioPlayer;

  beforeEach(() => {
    sources = [];
    channels = [];
    audioContext = createMockAudioContext();
    onPlaybackStart = vi.fn();
    onPlaybackEnd = vi.fn();
    player = new TtsAudioPlayer(audioContext, {
      sampleRate: 24000,
      initialPlaybackDelay: 0,
      onPlaybackStart,
      onPlaybackEnd,
    });
  });

  it('exposes the speech track built by the chain', () => {
    const track = player.createChain(0.5);

    expect(track).toBe(speechTrack);
    expect(player.getTrack()).toBe(speechTrack);
    expect(player.getVolume()).toBe(0.5);
  });

  it('throws when a chunk is enqueued before the chain is created', () => {
    expect(() => player.enqueue(pcmChunk([1, 2]))).toThrow('Playback chain is not created');
  });

  it('schedules chunks back to back', () => {
    player.createChain();

    const first = player.enqueue(pcmChunk(new Array(2400).fill(0)));
    const second = player.enqueue(pcmChunk(new Array(2400).fill(0)));

    expect(first).toBeCloseTo(0.1, 5);
    expect(second).toBeCloseTo(0.1, 5);
    expect(sources[0].start).toHaveBeenCalledWith(0);
    expect(sources[1].start).toHaveBeenCalledWith(0.1);
    expect(onPlaybackStart).toHaveBeenCalledTimes(1);
  });

  it('skips empty chunks', () => {
    player.createChain();

    expect(player.enqueue('')).toBe(0);
    expect(sources.length).toBe(0);
    expect(onPlaybackStart).not.toHaveBeenCalled();
  });

  it('reports the end of playback once every chunk is played', () => {
    player.createChain();
    player.enqueue(pcmChunk([1, 2]));
    player.enqueue(pcmChunk([3, 4]));

    sources[0].onended?.();
    expect(onPlaybackEnd).not.toHaveBeenCalled();
    expect(player.isPlaying()).toBe(true);

    sources[1].onended?.();
    expect(onPlaybackEnd).toHaveBeenCalledTimes(1);
    expect(player.isPlaying()).toBe(false);
  });

  it('stops the scheduled chunks on clear', () => {
    player.createChain();
    player.enqueue(pcmChunk([1, 2]));
    player.clear();

    expect(sources[0].stop).toHaveBeenCalled();
    expect(player.isPlaying()).toBe(false);
    expect(onPlaybackEnd).toHaveBeenCalledTimes(1);

    player.clear();
    expect(onPlaybackEnd).toHaveBeenCalledTimes(1);
  });

  it('connects to the audio output only once', () => {
    player.createChain();

    player.connectToOutput();
    player.connectToOutput();
    expect(gainNode.connect).toHaveBeenCalledTimes(2); // destination stream + audio output

    player.disconnectFromOutput();
    expect(gainNode.disconnect).toHaveBeenCalledWith(audioContext.destination);
  });

  it('clamps the volume', () => {
    player.createChain();

    player.setVolume(2);
    expect(player.getVolume()).toBe(1);

    player.setVolume(-1);
    expect(player.getVolume()).toBe(0);
  });

  it('carries an odd trailing byte over to the next chunk', () => {
    player.createChain();

    player.enqueue(rawChunk([0x00, 0x40, 0x11])); // one full sample plus the low byte of the next one
    player.enqueue(rawChunk([0x00])); // its high byte

    expect(channels.length).toBe(2);
    expect(Array.from(channels[0])).toEqual([0x4000 / 0x8000]);
    expect(Array.from(channels[1])).toEqual([0x0011 / 0x8000]);
  });

  it('drops the carried byte when a generation ends', () => {
    player.createChain();
    player.enqueue(rawChunk([0x00, 0x40, 0x11]));
    player.resetDecoder();

    expect(player.enqueue(rawChunk([0x00]))).toBe(0);
    expect(sources.length).toBe(1);
  });

  it('warns about a playback underrun', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    player.createChain();
    player.enqueue(pcmChunk(new Array(2400).fill(0))); // 0.1 s, ends at 0.1
    player.enqueue(pcmChunk(new Array(2400).fill(0)));

    expect(warn).not.toHaveBeenCalled();

    player.clear();
    (audioContext as unknown as { currentTime: number }).currentTime = 0.3;
    player.enqueue(pcmChunk(new Array(2400).fill(0)));
    expect(warn).not.toHaveBeenCalled(); // the first chunk of a stream is not an underrun

    player.enqueue(pcmChunk(new Array(2400).fill(0)));
    expect(warn).not.toHaveBeenCalled();

    (audioContext as unknown as { currentTime: number }).currentTime = 0.7;
    player.enqueue(pcmChunk(new Array(2400).fill(0)));

    expect(warn).toHaveBeenCalledWith('TTS playback underrun: gap 200 ms');

    warn.mockRestore();
  });

  it('releases the chain on disconnect', () => {
    player.createChain();
    player.enqueue(pcmChunk([1, 2]));
    player.disconnect();

    expect(player.getTrack()).toBeNull();
    expect(player.getVolume()).toBe(1.0);
  });
});
