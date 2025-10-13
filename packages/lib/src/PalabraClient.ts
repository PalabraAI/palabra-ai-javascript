import { PalabraClientData, TrackSid } from '~/PalabraClient.model';
import { PalabraApiClient } from '~/api/api';
import { PalabraWebRtcTransport } from '~/transport/PalabraWebRtcTransport';
import { PipelineConfigManager } from '~/config/PipelineConfigManager';
import { TargetLangCode } from '~/utils/target';
import { SourceLangCode } from '~/utils/source';
import {
  EVENT_CONNECTION_STATE_CHANGED,
  EVENT_ORIGINAL_TRACK_VOLUME_CHANGED,
  EVENT_REMOTE_TRACKS_UPDATE,
  EVENT_START_TRANSLATION,
  EVENT_STOP_TRANSLATION,
  PalabraEvents,
  PROXY_EVENTS,
  RemoteTrackInfo,
} from '~/transport/PalabraWebRtcTransport.model';
import { PalabraBaseEventEmitter } from '~/PalabraBaseEventEmitter';
import { SessionResponse } from '~/api/api.model';
import { supportsAudioContextSetSinkId, VolumeNode } from './utils';
import { ConnectionState } from 'livekit-client';
import { PipelineConfig } from './config';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class PalabraClient<CM extends PipelineConfigManager<any> = PipelineConfigManager<unknown>> extends PalabraBaseEventEmitter {
  private translateFrom: SourceLangCode;
  private translateTo: TargetLangCode;
  private auth: PalabraClientData['auth'];
  private apiClient: PalabraApiClient;
  private handleOriginalTrack: PalabraClientData['handleOriginalTrack'];
  private originalTrack: MediaStreamTrack | null = null;
  private originalTrackVolumeNode: VolumeNode | null = null;
  public transport: PalabraWebRtcTransport | null = null;
  private transportType: PalabraClientData['transportType'];
  private configManager: CM;
  private audioContext: AudioContext;


  private initialOriginalTrack: MediaStreamTrack | null = null;

  private shouldPlayTranslation: boolean;

  private translationTracks = new Map<TrackSid, RemoteTrackInfo>();

  private sessionData: SessionResponse | null = null;

  private deviceId = '';

  private translationStatus: 'init' | 'ongoing' | 'paused' | 'stopped' = 'init';

  private connectionStatus: ConnectionState | 'init' = 'init';

  private ignoreAudioContext: PalabraClientData['ignoreAudioContext'];

  constructor(data: PalabraClientData<CM>) {
    super();

    this.auth = data.auth;
    this.translateFrom = data.translateFrom;
    this.translateTo = data.translateTo;
    this.handleOriginalTrack = data.handleOriginalTrack;
    this.apiClient = new PalabraApiClient(this.auth, data.apiBaseUrl ?? 'https://api.palabra.ai', data.intent);

    this.transportType = data.transportType ?? 'webrtc';

    this.shouldPlayTranslation = false;

    this.ignoreAudioContext = data.ignoreAudioContext ?? false;

    if (data.configManager) {
      this.configManager = data.configManager;
    }

    this.initConfig();

    this.initAudioContext(data.audioContext);
  }

  public async startTranslation(): Promise<boolean> {
    try {
      await this.wrapOriginalTrack();
      const transport = await this.createSession();
      this.initTransportHandlers();
      await transport.connect();
      this.translationStatus = 'ongoing';
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
    this.cleanUnusedTracks([]);
    this.translationStatus = 'stopped';
    this.cleanupOriginalTrack();
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

  public async pauseTranslation() {
    await this.transport?.pauseTask();
    this.translationStatus = 'paused';
  }

  public async resumeTranslation() {
    await this.transport?.resumeTask();
    this.translationStatus = 'ongoing';
  }

  public getTranslationStatus() {
    return this.translationStatus;
  }

  public getConnectionStatus() {
    return this.connectionStatus;
  }

  public getVolume(language: string) {
    const [sid, remoteTrackInfo] = Array.from(this.translationTracks.entries()).find(entry => entry[1].language === language);
    if (!sid) return null;
    return remoteTrackInfo.remoteAudioTrack.getVolume();
  }

  public setVolume(language: string, volume: number) {
    this.translationTracks?.forEach(track => {
      if (track.language === language) {
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
    if (!this.transport) return;
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

    this.transport.on(EVENT_CONNECTION_STATE_CHANGED, (state) => {
      this.connectionStatus = state;
      this.emit(EVENT_CONNECTION_STATE_CHANGED, state);
    });
  }

  public muteOriginalTrack() {
    this.originalTrack.enabled = false;
  }

  public unmuteOriginalTrack() {
    this.originalTrack.enabled = true;
  }

  public setOriginalVolume(volume: number) {
    if (!this.originalTrackVolumeNode) return;
    this.originalTrackVolumeNode.setVolume(volume);
    this.emit(EVENT_ORIGINAL_TRACK_VOLUME_CHANGED, volume);
  }

  public getOriginalVolume() {
    return this.originalTrackVolumeNode?.getVolume() ?? 1.0;
  }

  private async wrapOriginalTrack() {
    this.initialOriginalTrack = await this.handleOriginalTrack();

    if (this.ignoreAudioContext) {
      this.originalTrack = this.initialOriginalTrack;
      return;
    }

    this.originalTrackVolumeNode = new VolumeNode(this.audioContext);
    this.originalTrack = this.originalTrackVolumeNode.createChain(this.initialOriginalTrack);
  }

  public cleanupOriginalTrack() {
    this.originalTrackVolumeNode?.disconnect();

    this.originalTrack?.stop();
    this.originalTrack = null;

    this.initialOriginalTrack?.stop();
    this.initialOriginalTrack = null;
  }

  protected async createSession() {
    const sessionResponse = await this.apiClient.createStreamingSession();

    if (!sessionResponse || !sessionResponse.ok) {
      throw new Error('Failed to create streaming session');
    }

    if (!sessionResponse.data) {
      throw new Error('No data received from streaming session');
    }

    this.sessionData = sessionResponse.data;

    this.transport = new PalabraWebRtcTransport({
      streamUrl: sessionResponse.data.webrtc_url,
      accessToken: sessionResponse.data.publisher,
      inputStream: new MediaStream([this.originalTrack]),
      configManager: this.configManager,
      audioContext: supportsAudioContextSetSinkId() ? this.audioContext : undefined,
    });

    return this.transport;
  }

  public getConfigManager(): CM {
    return this.configManager;
  }

  public getConfig() {
    return this.configManager.getConfig();
  }

  protected async deleteSession() {
    if (!this.sessionData) {
      console.error('No session data found');
      return;
    }
    try {
      await this.apiClient.deleteStreamingSession(this.sessionData.id);
    } catch (error) {
      throw error;
    } finally {
      this.sessionData = null;
    }
  }

  public async setTranslateFrom(code: PalabraClientData['translateFrom']) {
    this.translateFrom = code;
    this.configManager.setSourceLanguage(code as SourceLangCode);
    await this.transport?.setTask(this.configManager.getConfig());
  }

  public async setTranslateTo(code: PalabraClientData['translateTo'], previousCode?: PalabraClientData['translateTo']) {
    this.translateTo = code;

    const translations = this.configManager.getValue('translations');

    if (translations.length === 0) {
      this.configManager.addTranslationTarget({ target_language: code as TargetLangCode });
      await this.transport?.setTask(this.configManager.getConfig());
      return;
    }

    if (!previousCode) {
      translations[0].target_language = code;
      await this.transport?.setTask(this.configManager.getConfig());
      return;
    }

    const translation = translations.find((t) => t.target_language === previousCode);

    if (translation) {
      translation.target_language = code;
      await this.transport?.setTask(this.configManager.getConfig());
    }
  }

  async addTranslationTarget(target: TargetLangCode) {
    this.configManager.addTranslationTarget({ target_language: target });
    await this.transport?.setTask(this.configManager.getConfig());
  }

  async removeTranslationTarget(target: TargetLangCode | TargetLangCode[]) {

    if (Array.isArray(target)) {
      target.forEach((t) => this.configManager.deleteTranslationTarget(t));
    } else {
      this.configManager.deleteTranslationTarget(target);
    }
    await this.transport?.setTask(this.configManager.getConfig());
  }

  public async cleanup() {
    await this.stopTranslation();
    this.closeAudioContext();
    this.initConfig();
  }

  async changeAudioOutputDevice(deviceId: string) {
    this.deviceId = deviceId;
    this.transport?.getRoom().switchActiveDevice('audiooutput', this.deviceId);
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

  private async initAudioContext(audioContext?: AudioContext) {
    if (this.audioContext || this.ignoreAudioContext) return;
    this.audioContext = audioContext ?? new AudioContext();
  }

  private closeAudioContext() {
    this.audioContext?.close();
    this.audioContext = null;
  }

  private initConfig() {
    if (!this.configManager) {
      this.configManager = new PipelineConfigManager() as CM;
    }

    this.configManager.setSourceLanguage(this.translateFrom as SourceLangCode);
    this.configManager.addTranslationTarget({ target_language: this.translateTo as TargetLangCode });
  }

  public getApiClient() {
    return this.apiClient;
  }

  public async setTask(task: PipelineConfig) {
    this.configManager.setJSON(task.pipeline);
    await this.transport?.setTask(task);
  }
}

