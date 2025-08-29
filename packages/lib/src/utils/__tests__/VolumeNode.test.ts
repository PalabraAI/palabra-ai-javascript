import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VolumeNode } from '../VolumeNode';

// Mock MediaStream
class MockMediaStream {
  constructor(tracks: MediaStreamTrack[]) {
    this.tracks = tracks;
  }
  tracks: MediaStreamTrack[];
  getAudioTracks() { return this.tracks; }
}

// Set global MediaStream mock
if (typeof global.MediaStream === 'undefined') {
  // @ts-expect-error: Assigning mock class to global.MediaStream for test environment compatibility
  global.MediaStream = MockMediaStream;
}

// Mock AudioContext
const mockAudioContext = {
  createMediaStreamSource: vi.fn().mockReturnValue({
    connect: vi.fn(),
    disconnect: vi.fn(),
  }),
  createGain: vi.fn().mockReturnValue({
    gain: { value: 1 },
    connect: vi.fn(),
    disconnect: vi.fn(),
  }),
  createMediaStreamDestination: vi.fn().mockReturnValue({
    stream: {
      getAudioTracks: () => [{ id: 'mock-track' }],
    },
    connect: vi.fn(),
    disconnect: vi.fn(),
  }),
};

// Mock MediaStreamTrack
const mockTrack = {
  id: 'mock-track',
  kind: 'audio',
  enabled: true,
  stop: vi.fn(),
} as unknown as MediaStreamTrack;

describe('VolumeNode', () => {
  let volumeNode: VolumeNode;

  beforeEach(() => {
    vi.clearAllMocks();
    volumeNode = new VolumeNode(mockAudioContext as unknown as AudioContext);
  });

  it('should create a new VolumeNode', () => {
    expect(volumeNode).toBeDefined();
  });

  it('should create audio chain and return processed track', () => {
    const result = volumeNode.createChain(mockTrack, 0.5);

    expect(result).toBeDefined();
    expect(mockAudioContext.createMediaStreamSource).toHaveBeenCalled();
    expect(mockAudioContext.createGain).toHaveBeenCalled();
    expect(mockAudioContext.createMediaStreamDestination).toHaveBeenCalled();
  });

  it('should set volume correctly', () => {
    volumeNode.createChain(mockTrack);
    volumeNode.setVolume(0.7);

    const gainNode = mockAudioContext.createGain.mock.results[0].value;
    expect(gainNode.gain.value).toBe(0.7);
  });

  it('should get current volume', () => {
    volumeNode.createChain(mockTrack);
    const volume = volumeNode.getVolume();

    expect(volume).toBe(1.0);
  });

  it('should disconnect all nodes', () => {
    volumeNode.createChain(mockTrack);

    const sourceNode = mockAudioContext.createMediaStreamSource.mock.results[0].value;
    const gainNode = mockAudioContext.createGain.mock.results[0].value;
    const destinationNode = mockAudioContext.createMediaStreamDestination.mock.results[0].value;

    volumeNode.disconnect();

    expect(sourceNode.disconnect).toHaveBeenCalled();
    expect(gainNode.disconnect).toHaveBeenCalled();
    expect(destinationNode.disconnect).toHaveBeenCalled();
  });

  it('should constrain volume values to 0-1 range', () => {
    volumeNode.createChain(mockTrack);
    volumeNode.setVolume(-0.5);
    const gainNode = mockAudioContext.createGain.mock.results[0].value;
    expect(gainNode.gain.value).toBe(0);
    volumeNode.setVolume(1.5);
    expect(gainNode.gain.value).toBe(1);
  });
});
