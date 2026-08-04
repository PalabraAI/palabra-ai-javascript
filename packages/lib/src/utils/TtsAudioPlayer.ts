import { TTS_INITIAL_PLAYBACK_DELAY } from '~/tts/TtsDefaults';
import { base64ToUint8Array, pcm16ToFloat32 } from '~/utils/pcm';

export interface TtsAudioPlayerOptions {
  sampleRate: number;
  initialPlaybackDelay?: number;
  onPlaybackStart?: () => void;
  onPlaybackEnd?: () => void;
}

export class TtsAudioPlayer {
  private readonly audioContext: AudioContext;
  private readonly sampleRate: number;
  private readonly initialPlaybackDelay: number;
  private readonly onPlaybackStart?: () => void;
  private readonly onPlaybackEnd?: () => void;

  private gainNode: GainNode | null = null;
  private destination: MediaStreamAudioDestinationNode | null = null;
  private sources = new Set<AudioBufferSourceNode>();
  private nextStartTime = 0;
  private isConnectedToOutput = false;
  private carryByte: number | null = null;

  constructor(audioContext: AudioContext, options: TtsAudioPlayerOptions) {
    this.audioContext = audioContext;
    this.sampleRate = options.sampleRate;
    this.initialPlaybackDelay = options.initialPlaybackDelay ?? TTS_INITIAL_PLAYBACK_DELAY;
    this.onPlaybackStart = options.onPlaybackStart;
    this.onPlaybackEnd = options.onPlaybackEnd;
  }

  public createChain(initialVolume = 1.0): MediaStreamTrack {
    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = initialVolume;

    this.destination = this.audioContext.createMediaStreamDestination();
    this.gainNode.connect(this.destination);

    return this.destination.stream.getAudioTracks()[0];
  }

  public connectToOutput(): void {
    if (!this.gainNode || this.isConnectedToOutput) return;
    this.gainNode.connect(this.audioContext.destination);
    this.isConnectedToOutput = true;
  }

  public disconnectFromOutput(): void {
    if (!this.gainNode || !this.isConnectedToOutput) return;
    this.gainNode.disconnect(this.audioContext.destination);
    this.isConnectedToOutput = false;
  }

  public enqueue(pcmBase64: string): number {
    if (!this.gainNode) {
      throw new Error('Playback chain is not created. Call createChain() first');
    }

    const samples = this.decodeChunk(base64ToUint8Array(pcmBase64));

    if (!samples.length) return 0;

    const buffer = this.audioContext.createBuffer(1, samples.length, this.sampleRate);
    buffer.getChannelData(0).set(samples);

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.gainNode);

    source.onended = () => {
      this.sources.delete(source);
      source.disconnect();

      if (!this.sources.size) {
        this.nextStartTime = 0;
        this.onPlaybackEnd?.();
      }
    };

    const wasPlaying = this.isPlaying();
    const startAt = Math.max(this.nextStartTime, this.audioContext.currentTime + this.initialPlaybackDelay);

    if (this.nextStartTime && startAt > this.nextStartTime) {
      console.warn(`TTS playback underrun: gap ${Math.round((startAt - this.nextStartTime) * 1000)} ms`);
    }

    this.sources.add(source);
    source.start(startAt);
    this.nextStartTime = startAt + buffer.duration;

    if (!wasPlaying) {
      this.onPlaybackStart?.();
    }

    return buffer.duration;
  }

  public resetDecoder(): void {
    this.carryByte = null;
  }

  private decodeChunk(bytes: Uint8Array): Float32Array {
    let payload = bytes;

    if (this.carryByte !== null) {
      payload = new Uint8Array(bytes.byteLength + 1);
      payload[0] = this.carryByte;
      payload.set(bytes, 1);
      this.carryByte = null;
    }

    const tailLength = payload.byteLength % 2;

    if (tailLength) {
      this.carryByte = payload[payload.byteLength - 1];
    }

    return pcm16ToFloat32(payload.subarray(0, payload.byteLength - tailLength));
  }

  public clear(): void {
    const wasPlaying = this.isPlaying();

    this.sources.forEach(source => {
      source.onended = null;
      try {
        source.stop();
      } catch (error: unknown) {
        console.warn('Failed to stop scheduled TTS chunk:', error);
      }
      source.disconnect();
    });

    this.sources.clear();
    this.nextStartTime = 0;
    this.carryByte = null;

    if (wasPlaying) {
      this.onPlaybackEnd?.();
    }
  }

  public isPlaying(): boolean {
    return this.sources.size > 0;
  }

  public setVolume(volume: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  public getVolume(): number {
    return this.gainNode?.gain.value ?? 1.0;
  }

  public getTrack(): MediaStreamTrack | null {
    return this.destination?.stream.getAudioTracks()[0] ?? null;
  }

  public disconnect(): void {
    this.clear();
    this.disconnectFromOutput();

    this.gainNode?.disconnect();
    this.destination?.disconnect();

    this.gainNode = null;
    this.destination = null;
  }
}
