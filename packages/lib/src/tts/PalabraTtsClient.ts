import { PalabraTtsBaseEventEmitter } from '~/PalabraTtsBaseEventEmitter';
import { PalabraTtsWebSocketTransport } from '~/transport/PalabraTtsWebSocketTransport';
import {
  EVENT_TTS_AUDIO_CHUNK_RECEIVED,
  EVENT_TTS_CONNECTION_STATE_CHANGED,
  EVENT_TTS_GENERATION_COMPLETED,
  EVENT_TTS_PLAYBACK_ENDED,
  EVENT_TTS_PLAYBACK_STARTED,
  EVENT_TTS_SESSION_STARTED,
  EVENT_TTS_SESSION_STOPPED,
  EVENT_TTS_VOLUME_CHANGED,
  PalabraTtsEvents,
  TTS_PROXY_EVENTS,
  TtsConnectionState,
  TtsSessionStatus,
} from '~/transport/PalabraTtsWebSocketTransport.model';
import { PalabraTtsClientData, TtsSessionCredentials, TtsSpeakOptions } from '~/tts/PalabraTtsClient.model';
import { TtsConfigManager } from '~/tts/TtsConfigManager';
import { TtsOutputConfig, TtsVoiceOptions } from '~/tts/TtsConfig.model';
import { TTS_STREAM_PATH, TTS_WS_BASE_URL_EU } from '~/tts/TtsDefaults';
import { TtsLangCode } from '~/tts/tts-languages';
import { TtsAudioPlayer } from '~/utils/TtsAudioPlayer';
import { splitTextIntoChunks } from '~/utils/tts-text';
import { TtsAudioChunkData } from '~/utils/tts-data-filters.model';

/**
 * High level client of the realtime TTS API: keeps the websocket session, streams text
 * and plays the synthesized speech back gapless
 * @link https://docs.palabra.ai/docs/streaming_api/realtime_tts
 */
export class PalabraTtsClient extends PalabraTtsBaseEventEmitter {
  private auth: PalabraTtsClientData['auth'];
  private createSessionProvider?: PalabraTtsClientData['createSession'];
  private wsBaseUrl: string;
  private connectionTimeoutMs: PalabraTtsClientData['connectionTimeoutMs'];
  private configManager: TtsConfigManager;

  public transport: PalabraTtsWebSocketTransport | null = null;

  private audioContext: AudioContext | null = null;
  private player: TtsAudioPlayer | null = null;
  private speechTrack: MediaStreamTrack | null = null;

  private ignoreAudioContext: PalabraTtsClientData['ignoreAudioContext'];

  private shouldPlaySpeech = false;

  private volume = 1.0;

  private generationCounter = 0;

  private activeGenerations = new Set<string>();

  private sessionStatus: TtsSessionStatus = 'init';

  private connectionStatus: TtsConnectionState = 'init';

  constructor(data: PalabraTtsClientData) {
    super();

    this.auth = data.auth;
    this.createSessionProvider = data.createSession;

    if (!this.auth && !this.createSessionProvider) {
      throw new Error('Either `auth` or `createSession` must be provided');
    }

    this.wsBaseUrl = data.wsBaseUrl ?? TTS_WS_BASE_URL_EU;
    this.connectionTimeoutMs = data.connectionTimeoutMs;
    this.ignoreAudioContext = data.ignoreAudioContext ?? false;

    this.configManager = data.configManager ?? new TtsConfigManager();
    this.configManager
      .setLanguage(data.language)
      .setModel(data.model ?? this.configManager.getConfig().model)
      .setVoiceOptions(data.voiceOptions ?? {})
      .setOutput(data.output ?? {});

    this.initAudioContext(data.audioContext);
  }

  public async startSession(): Promise<boolean> {
    try {
      const transport = await this.createSession();
      this.initTransportHandlers();
      await transport.connect();
      this.initPlayer();
      this.sessionStatus = 'ongoing';
      this.emit(EVENT_TTS_SESSION_STARTED);
      return true;
    } catch (error) {
      await this.stopSession();
      throw error;
    }
  }

  public async stopSession(): Promise<void> {
    await this.transport?.disconnect();
    this.transport = null;
    this.activeGenerations.clear();
    this.cleanupPlayer();
    this.sessionStatus = 'stopped';
    this.emit(EVENT_TTS_SESSION_STOPPED);
  }

  public async speak(text: string, options: TtsSpeakOptions = {}): Promise<string> {
    if (!this.transport?.isConnected()) {
      throw new Error('TTS session is not started. Call startSession() first');
    }

    const chunks = splitTextIntoChunks(text);

    if (!chunks.length) {
      throw new Error('Nothing to synthesize: the text is empty');
    }

    const generationId = options.generationId ?? this.createGenerationId();

    this.activeGenerations.add(generationId);

    for (let index = 0; index < chunks.length; index++) {
      if (!this.activeGenerations.has(generationId)) break;

      const isLastChunk = index === chunks.length - 1;

      await this.transport.sendText(chunks[index], {
        generationId,
        isEos: isLastChunk ? options.isEos ?? true : false,
      });
    }

    return generationId;
  }

  public async cancel(): Promise<void> {
    this.activeGenerations.clear();
    this.player?.clear();
    await this.transport?.cancel();
  }

  public async startPlayback(): Promise<void> {
    this.shouldPlaySpeech = true;

    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume();
    }

    this.player?.connectToOutput();
  }

  public async stopPlayback(): Promise<void> {
    this.shouldPlaySpeech = false;
    this.player?.disconnectFromOutput();
    this.player?.clear();
  }

  public setVolume(volume: number): void {
    this.volume = volume;
    this.player?.setVolume(volume);
    this.emit(EVENT_TTS_VOLUME_CHANGED, this.player?.getVolume() ?? volume);
  }

  public getVolume(): number {
    return this.player?.getVolume() ?? this.volume;
  }

  public getSpeechTrack(): MediaStreamTrack | null {
    return this.speechTrack;
  }

  public async setLanguage(language: TtsLangCode): Promise<void> {
    this.configManager.setLanguage(language);
    await this.restartSessionIfOngoing();
  }

  public async setVoiceOptions(voiceOptions: Partial<TtsVoiceOptions>): Promise<void> {
    this.configManager.setVoiceOptions(voiceOptions);
    await this.restartSessionIfOngoing();
  }

  public async setOutput(output: Partial<TtsOutputConfig>): Promise<void> {
    this.configManager.setOutput(output);
    await this.restartSessionIfOngoing();
  }

  public getConfig() {
    return this.configManager.getConfig();
  }

  public getSessionStatus(): TtsSessionStatus {
    return this.sessionStatus;
  }

  public getConnectionStatus(): TtsConnectionState {
    return this.connectionStatus;
  }

  public async cleanup(): Promise<void> {
    await this.stopSession();
    this.closeAudioContext();
  }

  private async createSession(): Promise<PalabraTtsWebSocketTransport> {
    const { streamUrl, token } = this.createSessionProvider
      ? await this.createSessionProvider()
      : this.createSessionFromAuth();

    this.transport = new PalabraTtsWebSocketTransport({
      streamUrl,
      token,
      configManager: this.configManager,
      connectionTimeoutMs: this.connectionTimeoutMs,
    });

    return this.transport;
  }

  private createSessionFromAuth(): TtsSessionCredentials {
    if (!this.auth) {
      throw new Error('No auth configured for TTS session creation');
    }

    return {
      streamUrl: `${this.wsBaseUrl}${TTS_STREAM_PATH}`,
      token: this.auth.apiKey,
    };
  }

  private async restartSessionIfOngoing(): Promise<void> {
    if (this.sessionStatus !== 'ongoing') return;

    const shouldPlaySpeech = this.shouldPlaySpeech;

    await this.stopSession();
    await this.startSession();

    if (shouldPlaySpeech) {
      await this.startPlayback();
    }
  }

  private initTransportHandlers(): void {
    const transport = this.transport;

    if (!transport) return;

    TTS_PROXY_EVENTS.forEach(event => {
      transport.on(event, (...args) => this.emit(event, ...args as Parameters<PalabraTtsEvents[typeof event]>));
    });

    transport.on(EVENT_TTS_CONNECTION_STATE_CHANGED, (state) => {
      this.connectionStatus = state;
      this.emit(EVENT_TTS_CONNECTION_STATE_CHANGED, state);
    });

    transport.on(EVENT_TTS_AUDIO_CHUNK_RECEIVED, (chunk) => {
      this.handleAudioChunk(chunk);
    });
  }

  private handleAudioChunk(chunk: TtsAudioChunkData | null): void {
    if (!chunk || !this.activeGenerations.has(chunk.generation_id)) return;

    this.player?.enqueue(chunk.audio);

    if (chunk.last_chunk) {
      this.player?.resetDecoder();
      this.activeGenerations.delete(chunk.generation_id);
      this.emit(EVENT_TTS_GENERATION_COMPLETED, { generationId: chunk.generation_id });
    }
  }

  private initAudioContext(audioContext?: AudioContext): void {
    if (this.audioContext || this.ignoreAudioContext) return;

    if (audioContext) {
      this.audioContext = audioContext;
    } else {
      const { sample_rate } = this.configManager.getConfig().output;

      try {
        this.audioContext = new AudioContext({ sampleRate: sample_rate });
      } catch (error: unknown) {
        console.warn('Failed to open an audio context at the configured sample rate, falling back to the default one:', error);
        this.audioContext = new AudioContext();
      }
    }

    const contextSampleRate = Math.round(this.audioContext.sampleRate);

    if (Number.isFinite(contextSampleRate) && contextSampleRate > 0) {
      this.configManager.setOutput({ sample_rate: contextSampleRate });
    }
  }

  private initPlayer(): void {
    const { output } = this.configManager.getConfig();

    if (!this.audioContext || this.ignoreAudioContext) return;

    if (output.format !== 'pcm') {
      console.warn(`Playback is disabled: the "${output.format}" format can not be played chunk by chunk, use "pcm"`);
      return;
    }

    this.player = new TtsAudioPlayer(this.audioContext, {
      sampleRate: output.sample_rate,
      onPlaybackStart: () => this.emit(EVENT_TTS_PLAYBACK_STARTED),
      onPlaybackEnd: () => this.emit(EVENT_TTS_PLAYBACK_ENDED),
    });

    this.speechTrack = this.player.createChain(this.volume);

    if (this.shouldPlaySpeech) {
      this.player.connectToOutput();
    }
  }

  private cleanupPlayer(): void {
    this.player?.disconnect();
    this.player = null;
    this.speechTrack = null;
  }

  private closeAudioContext(): void {
    this.audioContext?.close();
    this.audioContext = null;
  }

  private createGenerationId(): string {
    this.generationCounter += 1;

    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }

    return `generation-${this.generationCounter}-${Date.now()}`;
  }
}
