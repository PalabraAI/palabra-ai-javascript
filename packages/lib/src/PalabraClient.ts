import { PalabraClientData } from '~/PalabraClient.model';
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
  RemoteTrackInfo,
} from '~/transport/PalabraWebRtcTransport.model';
import { PalabraBaseEventEmitter } from '~/PalabraBaseEventEmitter';
import { SessionResponse } from '~/api/api.model';
import { supportsAudioContextSetSinkId } from './utils';

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

  private shouldPlayTranslation: boolean;

  private translationTracks = new Map<string, RemoteTrackInfo>();

  private sessionData: SessionResponse | null = null;

  private deviceId = '';

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
      await this.stopTranslation();
      throw error;
    }
  }

  public async stopTranslation() {
    await this.transport?.disconnect();
    await this.deleteSession();
    this.transport = null;
    this.stopPlayback();
    this.closeAudioContext();
    this.cleanUnusedTracks([]);
    this.emit(EVENT_STOP_TRANSLATION);
  }

  public async startPlayback() {
    this.shouldPlayTranslation = true;
    this.playTracks();
  }

  public async stopPlayback() {
    this.shouldPlayTranslation = false;
    this.translationTracks.forEach(track => {
      track.remoteAudioTrack.detach();
    });
  }

  public setVolume(language: string, volume: number) {
    this.translationTracks?.forEach(track => {
      if (track.language === language) {
        console.log('setting volume', volume, 'for', language);
        track.remoteAudioTrack.setVolume(volume);
      }
    });
  }

  private cleanUnusedTracks(event: RemoteTrackInfo[]) {
    const newTracks = new Set(event.map(track => track.remoteAudioTrack.sid));
    this.translationTracks.forEach((track, sid) => {
      if (!newTracks.has(sid)) {
        track.remoteAudioTrack.detach();
        this.translationTracks.delete(sid);
      }
    });
  }

  private initTransportHandlers() {
    this.transport.on(EVENT_REMOTE_TRACKS_UPDATE, (event) => {

      this.cleanUnusedTracks(event);

      event.forEach(track => {
        if (!this.translationTracks.has(track.remoteAudioTrack.sid)) {
          this.translationTracks.set(track.remoteAudioTrack.sid, track);
        }
      });

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

    this.initAudioContext();

    this.transport = new PalabraWebRtcTransport({
      streamUrl: sessionResponse.data.webrtc_url,
      accessToken: sessionResponse.data.publisher,
      inputStream: new MediaStream([this.originalTrack]),
      configManager: this.configManager,
      audioContext: supportsAudioContextSetSinkId() ? this.audioContext : undefined,
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

  async changeAudioOutputDevice(deviceId: string) {
    this.deviceId = deviceId;
    this.transport.getRoom().switchActiveDevice('audiooutput', this.deviceId);
  }

  private isAttached(track: RemoteTrackInfo) {
    return track.remoteAudioTrack.attachedElements.length > 0;
  }

  private async playTracks() {
    this.translationTracks?.forEach(track => {
      if (!this.isAttached(track)) {
        track.remoteAudioTrack.attach();
      }
    });
  }

  private async initAudioContext() {
    if (this.audioContext) return;
    this.audioContext = new AudioContext();
  }

  private closeAudioContext() {
    this.audioContext?.close();
    this.audioContext = null;
  }

  private initConfig() {
    this.configManager = new PipelineConfigManager(this.transportType);

    this.configManager.setSourceLanguage(this.translateFrom as SourceLangCode);
    this.configManager.addTranslationTarget({ target_language: this.translateTo as TargetLangCode });
  }
}

