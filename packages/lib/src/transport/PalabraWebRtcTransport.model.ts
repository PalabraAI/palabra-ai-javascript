import { AllowedMessageTypes } from '~/config/PipelineConfig.model';
import { ConnectionState, RemoteParticipant, TrackPublishOptions } from 'livekit-client';
import { PipelineConfigManager } from '~/config/PipelineConfigManager';
import { filterErrorData, filterPartialTranscriptionData, filterPartialTranslatedTranscriptionData, filterPipelineTimingsData, filterTranscriptionData, filterTranslationData } from '~/utils/data-filters';
export interface PalabraWebRtcTransportConstructor{
  streamUrl: string;
  accessToken: string;
  inputStream: MediaStream;
  configManager: PipelineConfigManager;
  publishTrackSettings?: TrackPublishOptions;
}
export interface RemoteTrackInfo {
  track: MediaStreamTrack;
  language: string;
  participant: string;
}

export interface DataReceivedEvent {
  payload: DataReceivedEventPayload;
  participant: RemoteParticipant;
  topic: string;
}

export interface DataReceivedEventPayload {
  message_type: AllowedMessageTypes;
  data?: unknown;
}

export type TranscriptionEventPayload = unknown;

export const EVENT_REMOTE_TRACKS_UPDATE = 'remoteTracksUpdate';
export const EVENT_ROOM_CONNECTED = 'roomConnected';
export const EVENT_ROOM_DISCONNECTED = 'roomDisconnected';
export const EVENT_CONNECTION_STATE_CHANGED = 'connectionStateChanged';
export const EVENT_DATA_RECEIVED = 'dataReceived';
export const EVENT_START_TRANSLATION = 'startTranslation';
export const EVENT_STOP_TRANSLATION = 'stopTranslation';
export const EVENT_TRANSCRIPTION_RECEIVED = 'transcriptionReceived';
export const EVENT_TRANSLATION_RECEIVED = 'translationReceived';
export const EVENT_PARTIAL_TRANSLATED_TRANSCRIPTION_RECEIVED = 'partialTranslatedTranscriptionReceived';
export const EVENT_PARTIAL_TRANSCRIPTION_RECEIVED = 'partialTranscriptionReceived';
export const EVENT_PIPELINE_TIMINGS_RECEIVED = 'pipelineTimingsReceived';
export const EVENT_ERROR_RECEIVED = 'errorReceived';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type PalabraEvents = {
  [EVENT_REMOTE_TRACKS_UPDATE]: (data: RemoteTrackInfo[]) => void;
  [EVENT_ROOM_CONNECTED]: () => void;
  [EVENT_ROOM_DISCONNECTED]: () => void;
  [EVENT_CONNECTION_STATE_CHANGED]: (state: ConnectionState) => void;
  [EVENT_DATA_RECEIVED]: (event: DataReceivedEvent) => void;
  [EVENT_START_TRANSLATION]: () => void;
  [EVENT_STOP_TRANSLATION]: () => void;
  [EVENT_TRANSCRIPTION_RECEIVED]: (data: ReturnType<typeof filterTranscriptionData>) => void;
  [EVENT_TRANSLATION_RECEIVED]: (data: ReturnType<typeof filterTranslationData>) => void;
  [EVENT_PARTIAL_TRANSLATED_TRANSCRIPTION_RECEIVED]: (data: ReturnType<typeof filterPartialTranslatedTranscriptionData>) => void;
  [EVENT_PARTIAL_TRANSCRIPTION_RECEIVED]: (data: ReturnType<typeof filterPartialTranscriptionData>) => void;
  [EVENT_PIPELINE_TIMINGS_RECEIVED]: (data: ReturnType<typeof filterPipelineTimingsData>) => void;
  [EVENT_ERROR_RECEIVED]: (data: ReturnType<typeof filterErrorData>) => void;
}

export const PROXY_EVENTS: (keyof PalabraEvents)[] = [
  EVENT_ROOM_CONNECTED,
  EVENT_ROOM_DISCONNECTED,
  EVENT_CONNECTION_STATE_CHANGED,
  EVENT_DATA_RECEIVED,
  EVENT_START_TRANSLATION,
  EVENT_STOP_TRANSLATION,
  EVENT_TRANSCRIPTION_RECEIVED,
  EVENT_TRANSLATION_RECEIVED,
  EVENT_PARTIAL_TRANSLATED_TRANSCRIPTION_RECEIVED,
  EVENT_PARTIAL_TRANSCRIPTION_RECEIVED,
  EVENT_PIPELINE_TIMINGS_RECEIVED,
  EVENT_ERROR_RECEIVED,
];