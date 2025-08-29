export class VolumeNode {
  private source: MediaStreamAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private destination: MediaStreamAudioDestinationNode | null = null;
  private audioContext: AudioContext;

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;
  }

  public createChain(inputTrack: MediaStreamTrack, initialVolume = 1.0): MediaStreamTrack {
    const inputStream = new MediaStream([inputTrack]);
    this.source = this.audioContext.createMediaStreamSource(inputStream);

    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = initialVolume;

    this.destination = this.audioContext.createMediaStreamDestination();

    this.source.connect(this.gainNode);
    this.gainNode.connect(this.destination);

    return this.destination.stream.getAudioTracks()[0];
  }

  public setVolume(volume: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  public getVolume(): number {
    return this.gainNode?.gain.value ?? 1.0;
  }

  public disconnect(): void {
    this.source?.disconnect();
    this.gainNode?.disconnect();
    this.destination?.disconnect();

    this.source = null;
    this.gainNode = null;
    this.destination = null;
  }
}
