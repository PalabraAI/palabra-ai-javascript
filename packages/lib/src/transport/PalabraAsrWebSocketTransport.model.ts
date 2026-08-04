import { AsrConfigManager } from '~/asr/AsrConfigManager';
import {
  filterAsrFinalTranscriptionData,
  filterAsrPartialTranscriptionData,
  filterAsrTranslatedTranscriptionData,
} from '~/utils/asr-data-filters';
import { AsrServerMessage } from '~/utils/asr-data-filters.model';

export interface PalabraAsrWebSocketTransportConstructor {
  streamUrl: string;
  token: string;
  configManager: AsrConfigManager;
  connectionTimeoutMs?: number;
}

export type AsrConnectionState = 'init' | 'connecting' | 'connected' | 'disconnected';

export type AsrSessionStatus = 'init' | 'ongoing' | 'stopped';

export interface AsrMessageReceivedEvent {
  payload: AsrServerMessage;
}

export interface AsrDisconnectedEvent {
  code: number;
  reason: string;
}

export const EVENT_ASR_CONNECTED = 'asrConnected';
export const EVENT_ASR_DISCONNECTED = 'asrDisconnected';
export const EVENT_ASR_CONNECTION_STATE_CHANGED = 'asrConnectionStateChanged';
export const EVENT_ASR_MESSAGE_RECEIVED = 'asrMessageReceived';
export const EVENT_ASR_PARTIAL_TRANSCRIPTION_RECEIVED = 'asrPartialTranscriptionReceived';
export const EVENT_ASR_TRANSCRIPTION_RECEIVED = 'asrTranscriptionReceived';
export const EVENT_ASR_TRANSLATED_TRANSCRIPTION_RECEIVED = 'asrTranslatedTranscriptionReceived';
export const EVENT_ASR_ERROR_RECEIVED = 'asrErrorReceived';
export const EVENT_ASR_SESSION_STARTED = 'asrSessionStarted';
export const EVENT_ASR_SESSION_STOPPED = 'asrSessionStopped';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type PalabraAsrEvents = {
  [EVENT_ASR_CONNECTED]: () => void;
  [EVENT_ASR_DISCONNECTED]: (event: AsrDisconnectedEvent) => void;
  [EVENT_ASR_CONNECTION_STATE_CHANGED]: (state: AsrConnectionState) => void;
  [EVENT_ASR_MESSAGE_RECEIVED]: (event: AsrMessageReceivedEvent) => void;
  [EVENT_ASR_PARTIAL_TRANSCRIPTION_RECEIVED]: (data: ReturnType<typeof filterAsrPartialTranscriptionData>) => void;
  [EVENT_ASR_TRANSCRIPTION_RECEIVED]: (data: ReturnType<typeof filterAsrFinalTranscriptionData>) => void;
  [EVENT_ASR_TRANSLATED_TRANSCRIPTION_RECEIVED]: (data: ReturnType<typeof filterAsrTranslatedTranscriptionData>) => void;
  [EVENT_ASR_ERROR_RECEIVED]: (error: Error) => void;
  [EVENT_ASR_SESSION_STARTED]: () => void;
  [EVENT_ASR_SESSION_STOPPED]: () => void;
}

export const ASR_PROXY_EVENTS: (keyof PalabraAsrEvents)[] = [
  EVENT_ASR_CONNECTED,
  EVENT_ASR_DISCONNECTED,
  EVENT_ASR_MESSAGE_RECEIVED,
  EVENT_ASR_PARTIAL_TRANSCRIPTION_RECEIVED,
  EVENT_ASR_TRANSCRIPTION_RECEIVED,
  EVENT_ASR_TRANSLATED_TRANSCRIPTION_RECEIVED,
  EVENT_ASR_ERROR_RECEIVED,
];
