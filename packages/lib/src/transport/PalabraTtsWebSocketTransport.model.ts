import { TtsConfigManager } from '~/tts/TtsConfigManager';
import { filterTtsAudioChunkData, filterTtsErrorData } from '~/utils/tts-data-filters';
import { TtsServerMessage } from '~/utils/tts-data-filters.model';

export interface PalabraTtsWebSocketTransportConstructor {
  streamUrl: string;
  token: string;
  configManager: TtsConfigManager;
  connectionTimeoutMs?: number;
}

export type TtsConnectionState = 'init' | 'connecting' | 'connected' | 'disconnected';

export type TtsSessionStatus = 'init' | 'ongoing' | 'stopped';

export interface TtsSendTextOptions {
  generationId?: string;
  isEos?: boolean;
}

export interface TtsMessageReceivedEvent {
  payload: TtsServerMessage;
}

export interface TtsDisconnectedEvent {
  code: number;
  reason: string;
}

export interface TtsGenerationCompletedEvent {
  generationId: string;
}

export const EVENT_TTS_CONNECTED = 'ttsConnected';
export const EVENT_TTS_DISCONNECTED = 'ttsDisconnected';
export const EVENT_TTS_CONNECTION_STATE_CHANGED = 'ttsConnectionStateChanged';
export const EVENT_TTS_MESSAGE_RECEIVED = 'ttsMessageReceived';
export const EVENT_TTS_AUDIO_CHUNK_RECEIVED = 'ttsAudioChunkReceived';
export const EVENT_TTS_ERROR_RECEIVED = 'ttsErrorReceived';
export const EVENT_TTS_GENERATION_COMPLETED = 'ttsGenerationCompleted';
export const EVENT_TTS_SESSION_STARTED = 'ttsSessionStarted';
export const EVENT_TTS_SESSION_STOPPED = 'ttsSessionStopped';
export const EVENT_TTS_PLAYBACK_STARTED = 'ttsPlaybackStarted';
export const EVENT_TTS_PLAYBACK_ENDED = 'ttsPlaybackEnded';
export const EVENT_TTS_VOLUME_CHANGED = 'ttsVolumeChanged';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type PalabraTtsEvents = {
  [EVENT_TTS_CONNECTED]: () => void;
  [EVENT_TTS_DISCONNECTED]: (event: TtsDisconnectedEvent) => void;
  [EVENT_TTS_CONNECTION_STATE_CHANGED]: (state: TtsConnectionState) => void;
  [EVENT_TTS_MESSAGE_RECEIVED]: (event: TtsMessageReceivedEvent) => void;
  [EVENT_TTS_AUDIO_CHUNK_RECEIVED]: (data: ReturnType<typeof filterTtsAudioChunkData>) => void;
  [EVENT_TTS_ERROR_RECEIVED]: (data: ReturnType<typeof filterTtsErrorData>) => void;
  [EVENT_TTS_GENERATION_COMPLETED]: (event: TtsGenerationCompletedEvent) => void;
  [EVENT_TTS_SESSION_STARTED]: () => void;
  [EVENT_TTS_SESSION_STOPPED]: () => void;
  [EVENT_TTS_PLAYBACK_STARTED]: () => void;
  [EVENT_TTS_PLAYBACK_ENDED]: () => void;
  [EVENT_TTS_VOLUME_CHANGED]: (volume: number) => void;
}

export const TTS_PROXY_EVENTS: (keyof PalabraTtsEvents)[] = [
  EVENT_TTS_CONNECTED,
  EVENT_TTS_DISCONNECTED,
  EVENT_TTS_MESSAGE_RECEIVED,
  EVENT_TTS_AUDIO_CHUNK_RECEIVED,
  EVENT_TTS_ERROR_RECEIVED,
];
