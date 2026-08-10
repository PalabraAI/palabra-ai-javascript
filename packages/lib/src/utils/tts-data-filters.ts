import { PalabraTtsBaseEventEmitter } from '~/PalabraTtsBaseEventEmitter';
import {
  EVENT_TTS_AUDIO_CHUNK_RECEIVED,
  EVENT_TTS_ERROR_RECEIVED,
} from '~/transport/PalabraTtsWebSocketTransport.model';
import { tryParse } from '~/utils/data-filters';
import {
  TtsAudioChunkData,
  TtsErrorData,
  TtsServerMessage,
  TTS_RETRYABLE_ERROR_CODES,
} from '~/utils/tts-data-filters.model';

export const filterTtsAudioChunkData = (data: TtsServerMessage): TtsAudioChunkData | null => {
  if (data.message_type === 'audio_chunk') {
    return tryParse(data.data) as TtsAudioChunkData;
  }
  return null;
};

export const filterTtsErrorData = (data: TtsServerMessage): TtsErrorData | null => {
  if (data.message_type === 'error') {
    return tryParse(data.data) as TtsErrorData;
  }
  return null;
};

export const isRetryableTtsError = (data: TtsErrorData | null): boolean => {
  return !!data && TTS_RETRYABLE_ERROR_CODES.includes(data.code);
};

export const handleReceivedTtsData = (palabraTtsEventEmitter: PalabraTtsBaseEventEmitter, data: TtsServerMessage) => {
  switch (data.message_type) {
  case 'audio_chunk':
    palabraTtsEventEmitter.emit(EVENT_TTS_AUDIO_CHUNK_RECEIVED, filterTtsAudioChunkData(data));
    break;
  case 'error':
    palabraTtsEventEmitter.emit(EVENT_TTS_ERROR_RECEIVED, filterTtsErrorData(data));
    break;
  }
};
