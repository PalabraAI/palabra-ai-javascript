import { PalabraAsrBaseEventEmitter } from '~/PalabraAsrBaseEventEmitter';
import {
  EVENT_ASR_PARTIAL_TRANSCRIPTION_RECEIVED,
  EVENT_ASR_TRANSCRIPTION_RECEIVED,
  EVENT_ASR_TRANSLATED_TRANSCRIPTION_RECEIVED,
} from '~/transport/PalabraAsrWebSocketTransport.model';
import { AsrServerMessage, AsrTranscriptionData } from '~/utils/asr-data-filters.model';

export const filterAsrPartialTranscriptionData = (data: AsrServerMessage): AsrTranscriptionData | null => {
  if (data.message_type === 'transcription' && !data.is_eos) {
    return data as unknown as AsrTranscriptionData;
  }
  return null;
};

export const filterAsrFinalTranscriptionData = (data: AsrServerMessage): AsrTranscriptionData | null => {
  if (data.message_type === 'transcription' && data.is_eos) {
    return data as unknown as AsrTranscriptionData;
  }
  return null;
};

export const filterAsrTranslatedTranscriptionData = (data: AsrServerMessage): AsrTranscriptionData | null => {
  if (data.message_type === 'translated_transcription') {
    return data as unknown as AsrTranscriptionData;
  }
  return null;
};

export const handleReceivedAsrData = (palabraAsrEventEmitter: PalabraAsrBaseEventEmitter, data: AsrServerMessage) => {
  switch (data.message_type) {
  case 'transcription':
    if (data.is_eos) {
      palabraAsrEventEmitter.emit(EVENT_ASR_TRANSCRIPTION_RECEIVED, filterAsrFinalTranscriptionData(data));
    } else {
      palabraAsrEventEmitter.emit(EVENT_ASR_PARTIAL_TRANSCRIPTION_RECEIVED, filterAsrPartialTranscriptionData(data));
    }
    break;
  case 'translated_transcription':
    palabraAsrEventEmitter.emit(EVENT_ASR_TRANSLATED_TRANSCRIPTION_RECEIVED, filterAsrTranslatedTranscriptionData(data));
    break;
  }
};
