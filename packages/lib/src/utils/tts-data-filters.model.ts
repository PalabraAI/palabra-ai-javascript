export type TtsServerMessageType = 'audio_chunk' | 'error';

export type TtsErrorCode =
  | 'SERVICE_UNAVAILABLE'
  | 'SERVER_ERROR'
  | 'UNKNOWN_ERROR'
  | 'BAD_REQUEST'
  | 'VALIDATION_ERROR'
  | 'CONFLICT'
  | 'SESSION_NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'RATE_LIMIT_EXCEEDED';

export const TTS_RETRYABLE_ERROR_CODES: TtsErrorCode[] = [
  'SERVICE_UNAVAILABLE',
  'RATE_LIMIT_EXCEEDED',
];

export interface TtsAudioChunkData {
  audio: string;
  size: number;
  generation_id: string;
  last_chunk: boolean;
  chunk_generation_delta: number;
  audio_len: number;
}

export interface TtsErrorData {
  code: TtsErrorCode;
  desc: string;
}

export interface TtsServerMessage {
  message_type: TtsServerMessageType;
  data?: unknown;
}
