import { PalabraClientData, PlayTranslationContext } from '~/PalabraClient.model';
import { PalabraApiClient } from '~/api/api';
import { PalabraWebRtcTransport } from '~/transport/PalabraWebRtcTransport';
import { PipelineConfigManager } from '~/config/PipelineConfigManager';
import { TargetLangCode } from '~/utils/target';
import { SourceLangCode } from '~/utils/source';
import {
  EVENT_REMOTE_TRACKS_UPDATE,
  EVENT_START_TRANSLATION,
  EVENT_STOP_TRANSLATION,
  PalabraEvents,
  PROXY_EVENTS,
} from '~/transport/PalabraWebRtcTransport.model';
import { PalabraBaseEventEmitter } from '~/PalabraBaseEventEmitter';
import { SessionResponse } from '~/api/api.model';

export class PalabraClient extends PalabraBaseEventEmitter {
  private translateFrom: string;
  private translateTo: string;
  private auth: PalabraClientData['auth'];
  private apiClient: PalabraApiClient;
  private handleOriginalTrack: PalabraClientData['handleOriginalTrack'];
  private originalTrack: MediaStreamTrack;
  public transport: PalabraWebRtcTransport;
  private transportType: PalabraClientData['transportType'];
  private configManager: PipelineConfigManager;
  private audioContext: AudioContext;
  private playTranslationContext: PlayTranslationContext = {
    streamSource: null,
    gainNode: null,
    audioElement: null,
    audioSources: [],
    gainNodes: [],
  };
  private shouldPlayTranslation: boolean;

  private translationTracks: MediaStreamTrack[];

  private sessionData: SessionResponse | null = null;

  constructor(data: PalabraClientData) {
    super();

    this.auth = data.auth;
    this.translateFrom = data.translateFrom;
    this.translateTo = data.translateTo;
    this.handleOriginalTrack = data.handleOriginalTrack;
    this.apiClient = new PalabraApiClient(this.auth, data.apiBaseUrl ?? 'https://api.palabra.ai');

    this.transportType = data.transportType ?? 'webrtc';

    this.initConfig();

    this.shouldPlayTranslation = false;
  }

  public async startTranslation(): Promise<boolean> {
    try {
      const transport = await this.createSession();
      this.initTransportHandlers();
      await transport.connect();
      this.emit(EVENT_START_TRANSLATION);
      return true;
    } catch (error) {
      console.error('Failed to start translation:', error);
      return false;
    }
  }

  public async stopTranslation() {
    await this.transport?.disconnect();
    await this.deleteSession();
    this.transport = null;
    this.emit(EVENT_STOP_TRANSLATION);
  }

  public async startPlayback() {
    await this.initAudioContext();
    this.shouldPlayTranslation = true;
    this.playTracks();
  }

  public async stopPlayback() {
    this.shouldPlayTranslation = false;
    this.resetPlayTranslationContext();
  }

  private initTransportHandlers() {

    this.transport.on(EVENT_REMOTE_TRACKS_UPDATE, (event) => {

      this.translationTracks = event.map(track => track.track);

      if (this.shouldPlayTranslation) {
        this.playTracks();
      }

      this.emit(EVENT_REMOTE_TRACKS_UPDATE, event);
    });

    PROXY_EVENTS.forEach(event => {
      this.transport.on(event, (...args) => this.emit(event, ...args as Parameters<PalabraEvents[typeof event]>));
    });
  }

  public muteOriginalTrack() {
    this.originalTrack.enabled = false;
  }

  public unmuteOriginalTrack() {
    this.originalTrack.enabled = true;
  }

  public async createSession() {
    const sessionResponse = await this.apiClient.createStreamingSession();

    if (!sessionResponse || !sessionResponse.ok) {
      throw new Error('Failed to create streaming session');
    }

    if (!sessionResponse.data) {
      throw new Error('No data received from streaming session');
    }

    this.sessionData = sessionResponse.data;

    this.originalTrack = await this.handleOriginalTrack();

    this.transport = new PalabraWebRtcTransport({
      streamUrl: sessionResponse.data.webrtc_url,
      accessToken: sessionResponse.data.publisher,
      inputStream: new MediaStream([this.originalTrack]),
      configManager: this.configManager,
    });

    return this.transport;
  }

  public getConfig() {
    return this.configManager.getConfig();
  }

  public async deleteSession() {
    if (!this.sessionData) {
      console.error('No session data found');
      return;
    }
    await this.apiClient.deleteStreamingSession(this.sessionData.id);
    this.sessionData = null;
  }

  public async setTranslateFrom(code: PalabraClientData['translateFrom']) {
    this.translateFrom = code;
    this.configManager.setSourceLanguage(code as SourceLangCode);
    await this.transport.setTask(this.configManager.getConfig());
  }

  public async setTranslateTo(code: PalabraClientData['translateTo']) {
    this.translateTo = code;

    this.configManager.getConfig().pipeline.translations
      .map((translation) => translation.target_language)
      .forEach((target) => {
        this.configManager.deleteTranslationTarget(target);
      });

    this.configManager.addTranslationTarget({ target_language: code as TargetLangCode });

    await this.transport.setTask(this.configManager.getConfig());
  }

  async addTranslationTarget(target: TargetLangCode) {
    this.configManager.addTranslationTarget({ target_language: target });
    await this.transport.setTask(this.configManager.getConfig());
  }

  async removeTranslationTarget(target: TargetLangCode | TargetLangCode[]) {

    if (Array.isArray(target)) {
      target.forEach((t) => this.configManager.deleteTranslationTarget(t));
    } else {
      this.configManager.deleteTranslationTarget(target);
    }
    await this.transport.setTask(this.configManager.getConfig());
  }

  public async cleanup() {
    await this.stopTranslation();
    await this.stopPlayback();
    this.initConfig();
  }

  private resetPlayTranslationContext() {
    this.playTranslationContext.streamSource?.disconnect();
    this.playTranslationContext.gainNode?.disconnect();
    this.playTranslationContext.audioElement?.pause();
    if (this.playTranslationContext.audioElement) {
      this.playTranslationContext.audioElement.srcObject = null;
    }
    this.playTranslationContext.audioElement = null;
    this.playTranslationContext.streamSource = null;
    this.playTranslationContext.gainNode = null;
  }

  private async playTracks() {
    if (!this.translationTracks || this.translationTracks.length === 0) return;

    const mediaStream = new MediaStream(this.translationTracks);

    const audioTracks = mediaStream.getAudioTracks();

    if (audioTracks.length === 0) {
      console.warn('No audio tracks found in MediaStream');
      return;
    }
    this.playTranslationContext.audioSources?.forEach(source => source.disconnect());
    this.playTranslationContext.gainNodes?.forEach(node => node.disconnect());

    if (!this.playTranslationContext.audioElement) {
      this.playTranslationContext.audioElement = new Audio();
    }
    this.playTranslationContext.audioElement.srcObject = mediaStream;
    this.playTranslationContext.audioElement.volume = 0;

    this.playTranslationContext.audioSources = [];
    this.playTranslationContext.gainNodes = [];

    const audioContext = new AudioContext();

    for (const track of audioTracks) {
      const singleTrackStream = new MediaStream([track]);
      const streamSource = audioContext?.createMediaStreamSource(singleTrackStream);
      const gainNode = audioContext?.createGain();

      streamSource.connect(gainNode);
      gainNode.connect(audioContext?.destination);

      this.playTranslationContext.audioSources.push(streamSource);
      this.playTranslationContext.gainNodes.push(gainNode);
    }

    if (audioContext?.state === 'suspended') {
      await audioContext?.resume();
    }
  }

  private async initAudioContext() {
    if (this.audioContext) return;
    this.audioContext = new AudioContext();
  }

  private initConfig() {
    this.configManager = new PipelineConfigManager(this.transportType);

    this.configManager.setSourceLanguage(this.translateFrom as SourceLangCode);
    this.configManager.addTranslationTarget({ target_language: this.translateTo as TargetLangCode });
  }
}

