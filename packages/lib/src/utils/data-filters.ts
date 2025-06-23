import { PalabraBaseEventEmitter } from '~/PalabraBaseEventEmitter';
import {
  DataReceivedEventPayload,
  EVENT_ERROR_RECEIVED,
  EVENT_PARTIAL_TRANSCRIPTION_RECEIVED,
  EVENT_PARTIAL_TRANSLATED_TRANSCRIPTION_RECEIVED,
  EVENT_PIPELINE_TIMINGS_RECEIVED,
  EVENT_TRANSCRIPTION_RECEIVED,
  EVENT_TRANSLATION_RECEIVED,
} from '~/transport/PalabraWebRtcTransport.model';
import { ErrorData, PipelineTimings, TranscriptionData } from '~/utils/data-filters.model';

const tryParse = (data: unknown) => {
  if (typeof data === 'object') {
    return data;
  }
  try {
    return JSON.parse(data as string);
  } catch (error:unknown) {
    console.error('Error parsing data:', error);
    return data;
  }
};

export const filterTranslationData = (data: DataReceivedEventPayload):TranscriptionData | null => {
  if (data.message_type === 'translated_transcription') {
    return tryParse(data.data) as TranscriptionData;
  }
  return null;
};

export const filterTranscriptionData = (data: DataReceivedEventPayload): TranscriptionData | null => {
  if (data.message_type === 'validated_transcription') {
    if (typeof data.data === 'object') {
      return data.data as TranscriptionData;
    }
  }
  return null;
};

export const filterPartialTranslatedTranscriptionData = (data: DataReceivedEventPayload): TranscriptionData | null => {
  if (data.message_type === 'partial_translated_transcription') {
    return tryParse(data.data) as TranscriptionData;
  }
  return null;
};

export const filterPartialTranscriptionData = (data: DataReceivedEventPayload): TranscriptionData | null => {
  if (data.message_type === 'partial_transcription') {
    if (typeof data.data === 'object') {
      return data.data as TranscriptionData;
    }
  }
  return null;
};

export const filterPipelineTimingsData = (data: DataReceivedEventPayload): PipelineTimings | null => {
  if (data.message_type === 'pipeline_timings') {
    return tryParse(data.data) as PipelineTimings;
  }
  return null;
};

export const filterErrorData = (data: DataReceivedEventPayload): ErrorData | null => {
  if (data.message_type === 'error') {
    return tryParse(data.data) as ErrorData;
  }
  return null;
};

export const handleReceivedData = (palabraEventEmitter: PalabraBaseEventEmitter, data: DataReceivedEventPayload) => {
  switch (data.message_type) {
  case 'translated_transcription':
    palabraEventEmitter.emit(EVENT_TRANSLATION_RECEIVED, filterTranslationData(data));
    break;
  case 'validated_transcription':
    palabraEventEmitter.emit(EVENT_TRANSCRIPTION_RECEIVED, filterTranscriptionData(data));
    break;
  case 'partial_translated_transcription':
    palabraEventEmitter.emit(EVENT_PARTIAL_TRANSLATED_TRANSCRIPTION_RECEIVED, filterPartialTranslatedTranscriptionData(data));
    break;
  case 'partial_transcription':
    palabraEventEmitter.emit(EVENT_PARTIAL_TRANSCRIPTION_RECEIVED, filterPartialTranscriptionData(data));
    break;
  case 'pipeline_timings':
    palabraEventEmitter.emit(EVENT_PIPELINE_TIMINGS_RECEIVED, filterPipelineTimingsData(data));
    break;
  case 'error':
    palabraEventEmitter.emit(EVENT_ERROR_RECEIVED, filterErrorData(data));
    break;
  }
};