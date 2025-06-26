import { LocalAudioTrack, Room, RoomEvent, Track, RemoteParticipant, RemoteTrack, TrackPublication, TrackPublishOptions } from 'livekit-client';
import { RealtimeTransport } from '~/transport/RealtimeTransport.model';
import {
  DataReceivedEventPayload,
  EVENT_CONNECTION_STATE_CHANGED,
  EVENT_DATA_RECEIVED,
  EVENT_REMOTE_TRACKS_UPDATE,
  EVENT_ROOM_CONNECTED,
  EVENT_ROOM_DISCONNECTED,
  PalabraWebRtcTransportConstructor,
  RemoteTrackInfo,
} from '~/transport/PalabraWebRtcTransport.model';
import { PipelineConfigManager } from '~/config/PipelineConfigManager';
import { AllowedMessageTypes, PipelineConfig } from '~/config/PipelineConfig.model';
import { PalabraBaseEventEmitter } from '~/PalabraBaseEventEmitter';
import { handleReceivedData } from '~/utils/data-filters';
export class PalabraWebRtcTransport extends PalabraBaseEventEmitter implements RealtimeTransport {
  private readonly room: Room;
  private readonly streamUrl: string;
  private readonly accessToken: string;
  private readonly inputStream: MediaStream;
  private localAudioTrack: LocalAudioTrack | null = null;
  public remoteTracks = new Map<string, RemoteTrackInfo>();
  private publishTrackSettings: TrackPublishOptions;
  private configManager: PipelineConfigManager;
  private allowedMessageTypesHash: Map<AllowedMessageTypes, number>;

  constructor(data: PalabraWebRtcTransportConstructor) {
    super();

    this.room = new Room();
    this.streamUrl = data.streamUrl;
    this.accessToken = data.accessToken;
    this.inputStream = data.inputStream;
    this.configManager = data.configManager;
    this.allowedMessageTypesHash = new Map();
    this.publishTrackSettings = data.publishTrackSettings || {
      dtx: false,
      red: false,
      audioPreset: {
        maxBitrate: 32000,
        priority: 'high' as RTCPriorityType,
      },
    };

    this.room.prepareConnection(this.streamUrl, this.accessToken);

    this.setupRoomEventHandlers();
  }

  private handleRemoteAudioTrack(track: RemoteTrack, publication: TrackPublication, participant: RemoteParticipant): void {
    try {
      console.log('handleRemoteAudioTrack >>>>>> participant', participant, publication);
      console.log('we set sid', track.sid);

      this.remoteTracks.set(track.sid, {
        track: track.mediaStreamTrack,
        language: publication.trackName?.split('_')[1] || 'unknown',
        participant: participant.identity,
      });

      console.log('all SIDS', Array.from(this.remoteTracks.keys()));

      this.emit(EVENT_REMOTE_TRACKS_UPDATE, Array.from(this.remoteTracks.values()));
    } catch (error) {
      console.error(`Failed to handle remote audio track from ${participant.identity}:`, error);
    }
  }

  async connect(): Promise<void> {
    try {
      console.log('✅ Connecting to LiveKit room... ' + this.streamUrl);

      await this.room.connect(this.streamUrl, this.accessToken, { autoSubscribe: true });

      await this.setTask(this.configManager.getConfig());

      await this.publishInputAudio();

      console.log('✅ Successfully connected and published audio');
    } catch (error) {
      console.error('❌ Failed to connect to LiveKit room:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      console.log('Disconnecting from LiveKit room...');
      await this.endTask();
      await this.room.disconnect();

      this.cleanupAudioResources();

      console.log('Successfully disconnected from LiveKit room');
    } catch (error) {
      console.error('Error during disconnect:', error);
      throw error;
    }
  }

  async setTask(task: PipelineConfig): Promise<void> {
    console.log('setTask >>>>>>', JSON.stringify(task));
    this.createHashForAllowedMessageTypes(task.pipeline.allowed_message_types);
    await this.sendCommand('set_task', task);
  }

  async endTask(): Promise<void> {
    console.log('endTask >>>>>>');
    await this.sendCommand('end_task', { 'force': false });
  }

  private createHashForAllowedMessageTypes(allowedMessageTypes: AllowedMessageTypes[]): void {
    allowedMessageTypes.forEach(type => {
      this.allowedMessageTypesHash.set(type, this.allowedMessageTypesHash.get(type) || 0 + 1);
    });
  }

  private async publishInputAudio(): Promise<void> {
    try {
      const audioTracks = this.inputStream.getAudioTracks();
      if (audioTracks.length === 0) {
        throw new Error('No audio track found in input stream');
      }
      this.localAudioTrack = new LocalAudioTrack(audioTracks[0]);
      await this.room.localParticipant.publishTrack(this.localAudioTrack, this.publishTrackSettings);
    } catch (error) {
      console.error('Failed to publish input audio:', error);
      throw error;
    }
  }

  async sendCommand(messageType: string, data: unknown): Promise<void> {
    const payload = JSON.stringify({ message_type: messageType, data });
    const encoder = new TextEncoder();
    await this.room.localParticipant.publishData(encoder.encode(payload), {});
  }

  private setupRoomEventHandlers(): void {
    this.room.on(RoomEvent.Connected, () => {
      this.emit(EVENT_ROOM_CONNECTED);
    });

    this.room.on(RoomEvent.Disconnected, () => {
      this.emit(EVENT_ROOM_DISCONNECTED);
      this.cleanupAudioResources();
    });

    this.room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
      console.log(`👤 Remote participant connected: ${participant}`);
    });

    this.room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
      console.log(`👋 Remote participant disconnected: ${participant.identity}`);
      this.removeRemoteAudioSourceByParticipant(participant.identity);
    });

    this.room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, publication: TrackPublication, participant: RemoteParticipant) => {
      console.log(`🎵 Track subscribed: ${publication.trackName} ${publication.trackSid}`, track.sid, track, 'from', participant.identity);
      if (track.kind === Track.Kind.Audio) {
        this.handleRemoteAudioTrack(track, publication, participant);
      }
    });

    this.room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack, publication: TrackPublication, participant: RemoteParticipant) => {
      console.log(`🔇 Track unsubscribed: ${publication.trackName} ${publication.trackSid} ${track.sid} ${track.kind} from ${participant.identity}`);
      if (track.kind === Track.Kind.Audio) {
        this.removeRemoteAudioSourceBySid(track.sid);
      }
    });

    this.room.on(RoomEvent.TrackPublished, (publication: TrackPublication, participant: RemoteParticipant) => {
      console.log(`📡 Track published: ${publication.kind} from ${participant.identity}`);
    });

    this.room.on(RoomEvent.ConnectionStateChanged, (state) => {
      this.emit(EVENT_CONNECTION_STATE_CHANGED, state);
    });

    this.room.on(RoomEvent.DataReceived, (payload, participant, topic) => {
      try {
        const decoder = new TextDecoder();
        const message = decoder.decode(payload);
        const data: DataReceivedEventPayload = JSON.parse(message);
        this.handleTranslationData(data, participant, topic);
      } catch (error) {
        console.error('❌ Failed to parse data message:', error, 'Raw payload:', payload);
      }
    });
  }

  private handleTranslationData(messageData: DataReceivedEventPayload, participant: RemoteParticipant, topic): void {
    if (this.allowedMessageTypesHash.get(messageData.message_type) || messageData.message_type === 'error') {
      handleReceivedData(this, messageData);
      this.emit(EVENT_DATA_RECEIVED, { payload: messageData, participant, topic });
    }
  }

  private removeRemoteAudioSourceBySid(sid: string): void {
    this.remoteTracks.delete(sid);
    this.emit(EVENT_REMOTE_TRACKS_UPDATE, Array.from(this.remoteTracks.values()));
    console.log(`Remote track from ${sid} removed from result stream`);
  }

  private removeRemoteAudioSourceByParticipant(participantIdentity: string): void {
    const sids = Array.from(this.remoteTracks.values()).map(data => data.participant === participantIdentity ? data.track.id : undefined);
    sids.forEach(sid => this.remoteTracks.delete(sid));
    this.emit(EVENT_REMOTE_TRACKS_UPDATE, Array.from(this.remoteTracks.values()));
    console.log(`Remote tracks from ${participantIdentity} removed from result stream`);
  }

  private cleanupAudioResources(): void {
    this.remoteTracks.clear();
    this.localAudioTrack = null;
  }

  getRoom(): Room {
    return this.room;
  }

  getConnectionState(): string {
    return this.room.state;
  }

  getParticipants(): RemoteParticipant[] {
    return Array.from(this.room.remoteParticipants.values());
  }

  isConnected(): boolean {
    return this.room.state === 'connected';
  }
}