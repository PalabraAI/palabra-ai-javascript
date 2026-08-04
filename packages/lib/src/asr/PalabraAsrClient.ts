import { PalabraAsrBaseEventEmitter } from '~/PalabraAsrBaseEventEmitter';
import { PalabraAsrWebSocketTransport } from '~/transport/PalabraAsrWebSocketTransport';
import {
  ASR_PROXY_EVENTS,
  AsrConnectionState,
  AsrSessionStatus,
  EVENT_ASR_CONNECTION_STATE_CHANGED,
  EVENT_ASR_SESSION_STARTED,
  EVENT_ASR_SESSION_STOPPED,
  PalabraAsrEvents,
} from '~/transport/PalabraAsrWebSocketTransport.model';
import { AsrSessionCredentials, PalabraAsrClientData } from '~/asr/PalabraAsrClient.model';
import { AsrConfigManager } from '~/asr/AsrConfigManager';
import { ASR_STREAM_PATH, ASR_WS_BASE_URL_EU } from '~/asr/AsrDefaults';
import { AsrLangCode, AsrTargetLangCode } from '~/asr/asr-languages';
import { AsrAudioCapture } from '~/utils/AsrAudioCapture';

export class PalabraAsrClient extends PalabraAsrBaseEventEmitter {
  private auth: PalabraAsrClientData['auth'];
  private createSessionProvider?: PalabraAsrClientData['createSession'];
  private handleOriginalTrack: PalabraAsrClientData['handleOriginalTrack'];
  private wsBaseUrl: string;
  private connectionTimeoutMs: PalabraAsrClientData['connectionTimeoutMs'];
  private chunkMs: PalabraAsrClientData['chunkMs'];
  private configManager: AsrConfigManager;

  public transport: PalabraAsrWebSocketTransport | null = null;

  private audioContext: AudioContext | null = null;
  private capture: AsrAudioCapture | null = null;
  private originalTrack: MediaStreamTrack | null = null;

  private sessionStatus: AsrSessionStatus = 'init';

  private connectionStatus: AsrConnectionState = 'init';

  constructor(data: PalabraAsrClientData) {
    super();

    this.auth = data.auth;
    this.createSessionProvider = data.createSession;
    this.handleOriginalTrack = data.handleOriginalTrack;

    if (!this.auth && !this.createSessionProvider) {
      throw new Error('Either `auth` or `createSession` must be provided');
    }

    this.wsBaseUrl = data.wsBaseUrl ?? ASR_WS_BASE_URL_EU;
    this.connectionTimeoutMs = data.connectionTimeoutMs;
    this.chunkMs = data.chunkMs;

    this.configManager = data.configManager ?? new AsrConfigManager();
    this.configManager
      .setLanguage(data.language ?? this.configManager.getConfig().language)
      .setTranslateLanguages(data.translateLanguages ?? this.configManager.getConfig().translate_languages);

    if (data.enableFillerFilter !== undefined) {
      this.configManager.setFillerFilter(data.enableFillerFilter);
    }

    this.initAudioContext(data.audioContext);
  }

  public async startTranscription(): Promise<boolean> {
    try {
      this.originalTrack = await this.handleOriginalTrack();

      await this.resumeAudioContext();

      this.configManager.setSampleRate(this.getAudioContext().sampleRate);

      const transport = await this.createSession();
      this.initTransportHandlers();
      await transport.connect();
      await this.startCapture();

      this.sessionStatus = 'ongoing';
      this.emit(EVENT_ASR_SESSION_STARTED);
      return true;
    } catch (error) {
      await this.stopTranscription();
      throw error;
    }
  }

  public async stopTranscription(): Promise<void> {
    this.capture?.stop();
    this.capture = null;

    await this.transport?.disconnect();
    this.transport = null;

    this.cleanupOriginalTrack();

    this.sessionStatus = 'stopped';
    this.emit(EVENT_ASR_SESSION_STOPPED);
  }

  public muteOriginalTrack(): void {
    if (!this.originalTrack) return;
    this.originalTrack.enabled = false;
  }

  public unmuteOriginalTrack(): void {
    if (!this.originalTrack) return;
    this.originalTrack.enabled = true;
  }

  public isOriginalTrackMuted(): boolean {
    return this.originalTrack ? !this.originalTrack.enabled : false;
  }

  public getOriginalTrack(): MediaStreamTrack | null {
    return this.originalTrack;
  }

  public async setLanguage(language: AsrLangCode): Promise<void> {
    this.configManager.setLanguage(language);
    await this.restartSessionIfOngoing();
  }

  public async setTranslateLanguages(languages: AsrTargetLangCode[]): Promise<void> {
    this.configManager.setTranslateLanguages(languages);
    await this.restartSessionIfOngoing();
  }

  public getConfig() {
    return this.configManager.getConfig();
  }

  public getSessionStatus(): AsrSessionStatus {
    return this.sessionStatus;
  }

  public getConnectionStatus(): AsrConnectionState {
    return this.connectionStatus;
  }

  public async cleanup(): Promise<void> {
    await this.stopTranscription();
    this.closeAudioContext();
  }

  private async createSession(): Promise<PalabraAsrWebSocketTransport> {
    const { streamUrl, token } = this.createSessionProvider
      ? await this.createSessionProvider()
      : this.createSessionFromAuth();

    this.transport = new PalabraAsrWebSocketTransport({
      streamUrl,
      token,
      configManager: this.configManager,
      connectionTimeoutMs: this.connectionTimeoutMs,
    });

    return this.transport;
  }

  private createSessionFromAuth(): AsrSessionCredentials {
    if (!this.auth) {
      throw new Error('No auth configured for STT session creation');
    }

    return {
      streamUrl: `${this.wsBaseUrl}${ASR_STREAM_PATH}`,
      token: this.auth.apiKey,
    };
  }

  private async startCapture(): Promise<void> {
    if (!this.originalTrack) {
      throw new Error('No track available for transcription');
    }

    this.capture = new AsrAudioCapture(this.getAudioContext(), {
      chunkMs: this.chunkMs,
      onChunk: (chunk) => this.sendAudioChunk(chunk),
    });

    await this.capture.start(this.originalTrack);
  }

  private sendAudioChunk(chunk: ArrayBuffer): void {
    if (!this.transport?.isConnected()) return;

    try {
      this.transport.sendAudio(chunk);
    } catch (error) {
      console.error('Failed to send an audio chunk to the STT stream:', error);
    }
  }

  private async restartSessionIfOngoing(): Promise<void> {
    if (this.sessionStatus !== 'ongoing') return;

    await this.stopTranscription();
    await this.startTranscription();
  }

  private initTransportHandlers(): void {
    const transport = this.transport;

    if (!transport) return;

    ASR_PROXY_EVENTS.forEach(event => {
      transport.on(event, (...args) => this.emit(event, ...args as Parameters<PalabraAsrEvents[typeof event]>));
    });

    transport.on(EVENT_ASR_CONNECTION_STATE_CHANGED, (state) => {
      this.connectionStatus = state;
      this.emit(EVENT_ASR_CONNECTION_STATE_CHANGED, state);
    });
  }

  private initAudioContext(audioContext?: AudioContext): void {
    if (this.audioContext) return;
    this.audioContext = audioContext ?? null;
  }

  private getAudioContext(): AudioContext {
    if (this.audioContext) return this.audioContext;

    try {
      this.audioContext = new AudioContext({ sampleRate: this.configManager.getConfig().sample_rate });
    } catch (error) {
      console.warn('Failed to open an audio context at the configured sample rate, falling back to the default one:', error);
      this.audioContext = new AudioContext();
    }

    return this.audioContext;
  }

  private async resumeAudioContext(): Promise<void> {
    const audioContext = this.getAudioContext();

    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
  }

  private cleanupOriginalTrack(): void {
    this.originalTrack?.stop();
    this.originalTrack = null;
  }

  private closeAudioContext(): void {
    this.audioContext?.close();
    this.audioContext = null;
  }
}
