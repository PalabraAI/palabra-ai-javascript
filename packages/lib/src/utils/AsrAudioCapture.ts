import { ASR_CHUNK_MS } from '~/asr/AsrDefaults';
import { float32ToPcm16 } from '~/utils/pcm';

export interface AsrAudioCaptureOptions {
  chunkMs?: number;
  onChunk: (chunk: ArrayBuffer) => void;
}

const CAPTURE_PROCESSOR_NAME = 'palabra-asr-capture';

const captureProcessorCode = `
class PalabraAsrCaptureProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.chunkFrames = options.processorOptions.chunkFrames;
    this.buffer = new Float32Array(this.chunkFrames);
    this.filled = 0;
  }

  process(inputs) {
    const input = inputs[0] && inputs[0][0];

    if (!input) return true;

    let offset = 0;

    while (offset < input.length) {
      const size = Math.min(this.chunkFrames - this.filled, input.length - offset);

      this.buffer.set(input.subarray(offset, offset + size), this.filled);
      this.filled += size;
      offset += size;

      if (this.filled === this.chunkFrames) {
        const chunk = this.buffer.slice(0);
        this.port.postMessage(chunk, [chunk.buffer]);
        this.filled = 0;
      }
    }

    return true;
  }
}

registerProcessor('${CAPTURE_PROCESSOR_NAME}', PalabraAsrCaptureProcessor);
`;

const contextsWithModule = new WeakSet<AudioContext>();

export class AsrAudioCapture {
  private readonly audioContext: AudioContext;
  private readonly chunkMs: number;
  private readonly onChunk: (chunk: ArrayBuffer) => void;

  private source: MediaStreamAudioSourceNode | null = null;
  private worklet: AudioWorkletNode | null = null;
  private moduleUrl: string | null = null;

  constructor(audioContext: AudioContext, options: AsrAudioCaptureOptions) {
    this.audioContext = audioContext;
    this.chunkMs = options.chunkMs ?? ASR_CHUNK_MS;
    this.onChunk = options.onChunk;
  }

  public async start(track: MediaStreamTrack): Promise<void> {
    if (this.worklet) return;

    await this.loadModule();

    const chunkFrames = Math.round(this.audioContext.sampleRate * this.chunkMs / 1000);

    this.source = this.audioContext.createMediaStreamSource(new MediaStream([track]));
    this.worklet = new AudioWorkletNode(this.audioContext, CAPTURE_PROCESSOR_NAME, {
      numberOfInputs: 1,
      numberOfOutputs: 0,
      channelCount: 1,
      processorOptions: { chunkFrames },
    });

    this.worklet.port.onmessage = (event: MessageEvent<Float32Array>) => {
      this.onChunk(float32ToPcm16(event.data));
    };

    this.source.connect(this.worklet);
  }

  public stop(): void {
    if (this.worklet) {
      this.worklet.port.onmessage = null;
      this.worklet.disconnect();
      this.worklet = null;
    }

    this.source?.disconnect();
    this.source = null;

    if (this.moduleUrl) {
      URL.revokeObjectURL(this.moduleUrl);
      this.moduleUrl = null;
    }
  }

  public getSampleRate(): number {
    return this.audioContext.sampleRate;
  }

  public isCapturing(): boolean {
    return !!this.worklet;
  }

  private async loadModule(): Promise<void> {
    if (contextsWithModule.has(this.audioContext)) return;

    this.moduleUrl = URL.createObjectURL(new Blob([captureProcessorCode], { type: 'application/javascript' }));

    try {
      await this.audioContext.audioWorklet.addModule(this.moduleUrl);
      contextsWithModule.add(this.audioContext);
    } finally {
      URL.revokeObjectURL(this.moduleUrl);
      this.moduleUrl = null;
    }
  }
}
