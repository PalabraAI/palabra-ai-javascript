import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  filterTranslationData,
  filterTranscriptionData,
  filterPartialTranslatedTranscriptionData,
  filterPartialTranscriptionData,
  filterPipelineTimingsData,
  filterErrorData,
  handleReceivedData,
} from '../utils/data-filters';
import type { DataReceivedEventPayload } from '../transport/PalabraWebRtcTransport.model';
import { PalabraBaseEventEmitter } from '../PalabraBaseEventEmitter';
import {
  EVENT_ERROR_RECEIVED,
  EVENT_PARTIAL_TRANSCRIPTION_RECEIVED,
  EVENT_PARTIAL_TRANSLATED_TRANSCRIPTION_RECEIVED,
  EVENT_PIPELINE_TIMINGS_RECEIVED,
  EVENT_TRANSCRIPTION_RECEIVED,
  EVENT_TRANSLATION_RECEIVED,
} from '../transport/PalabraWebRtcTransport.model';

describe('Data Filters', () => {
  const mockTranscriptionData = { text: 'Hello world' };
  const mockPipelineTimings = { total: 100 };
  const mockErrorData = { code: 500, message: 'Internal Server Error' };

  describe('filterTranslationData', () => {
    it('should return translation data if message_type is translated_transcription', () => {
      const payload: DataReceivedEventPayload = {
        message_type: 'translated_transcription',
        data: JSON.stringify(mockTranscriptionData),
      };
      expect(filterTranslationData(payload)).toEqual(mockTranscriptionData);
    });
    it('should return translation data if message_type is translated_transcription and data is not a string', () => {
      const payload: DataReceivedEventPayload = {
        message_type: 'translated_transcription',
        data: mockTranscriptionData,
      };
      expect(filterTranslationData(payload)).toEqual(mockTranscriptionData);
    });
    it('should return given data if message_type is translated_transcription and data is invalid string', () => {
      const payload: DataReceivedEventPayload = {
        message_type: 'translated_transcription',
        data: '{invalid}',
      };
      expect(filterTranslationData(payload)).toEqual(payload.data);
    });

    it('should return null if message_type is not translated_transcription', () => {
      const payload: DataReceivedEventPayload = {
        message_type: 'validated_transcription',
        data: JSON.stringify(mockTranscriptionData),
      };
      expect(filterTranslationData(payload)).toBeNull();
    });
  });

  describe('filterTranscriptionData', () => {
    it('should return transcription data if message_type is validated_transcription', () => {
      const payload: DataReceivedEventPayload = {
        message_type: 'validated_transcription',
        data: mockTranscriptionData,
      };
      expect(filterTranscriptionData(payload)).toEqual(mockTranscriptionData);
    });

    it('should return null if message_type is not validated_transcription', () => {
      const payload: DataReceivedEventPayload = {
        message_type: 'translated_transcription',
        data: mockTranscriptionData,
      };
      expect(filterTranscriptionData(payload)).toBeNull();
    });
  });

  describe('filterPartialTranslatedTranscriptionData', () => {
    it('should return partial translated transcription data if message_type is partial_translated_transcription', () => {
      const payload: DataReceivedEventPayload = {
        message_type: 'partial_translated_transcription',
        data: JSON.stringify(mockTranscriptionData),
      };
      expect(filterPartialTranslatedTranscriptionData(payload)).toEqual(mockTranscriptionData);
    });

    it('should return null if message_type is not partial_translated_transcription', () => {
      const payload: DataReceivedEventPayload = {
        message_type: 'validated_transcription',
        data: JSON.stringify(mockTranscriptionData),
      };
      expect(filterPartialTranslatedTranscriptionData(payload)).toBeNull();
    });
  });

  describe('filterPartialTranscriptionData', () => {
    it('should return partial transcription data if message_type is partial_transcription', () => {
      const payload: DataReceivedEventPayload = {
        message_type: 'partial_transcription',
        data: mockTranscriptionData,
      };
      expect(filterPartialTranscriptionData(payload)).toEqual(mockTranscriptionData);
    });

    it('should return null if message_type is not partial_transcription', () => {
      const payload: DataReceivedEventPayload = {
        message_type: 'validated_transcription',
        data: mockTranscriptionData,
      };
      expect(filterPartialTranscriptionData(payload)).toBeNull();
    });
  });

  describe('filterPipelineTimingsData', () => {
    it('should return pipeline timings data if message_type is pipeline_timings', () => {
      const payload: DataReceivedEventPayload = {
        message_type: 'pipeline_timings',
        data: JSON.stringify(mockPipelineTimings),
      };
      expect(filterPipelineTimingsData(payload)).toEqual(mockPipelineTimings);
    });

    it('should return null if message_type is not pipeline_timings', () => {
      const payload: DataReceivedEventPayload = {
        message_type: 'validated_transcription',
        data: JSON.stringify(mockPipelineTimings),
      };
      expect(filterPipelineTimingsData(payload)).toBeNull();
    });
  });

  describe('filterErrorData', () => {
    it('should return error data if message_type is error', () => {
      const payload: DataReceivedEventPayload = {
        message_type: 'error',
        data: JSON.stringify(mockErrorData),
      };
      expect(filterErrorData(payload)).toEqual(mockErrorData);
    });

    it('should return null if message_type is not error', () => {
      const payload: DataReceivedEventPayload = {
        message_type: 'validated_transcription',
        data: JSON.stringify(mockErrorData),
      };
      expect(filterErrorData(payload)).toBeNull();
    });
  });

  describe('handleReceivedData', () => {
    let palabraEventEmitter: PalabraBaseEventEmitter;

    beforeEach(() => {
      palabraEventEmitter = new PalabraBaseEventEmitter();
      palabraEventEmitter.emit = vi.fn();
    });

    it('should emit EVENT_TRANSLATION_RECEIVED for translated_transcription', () => {
      const payload: DataReceivedEventPayload = { message_type: 'translated_transcription', data: JSON.stringify(mockTranscriptionData) };
      handleReceivedData(palabraEventEmitter, payload);
      expect(palabraEventEmitter.emit).toHaveBeenCalledWith(EVENT_TRANSLATION_RECEIVED, mockTranscriptionData);
    });

    it('should emit EVENT_TRANSCRIPTION_RECEIVED for validated_transcription', () => {
      const payload: DataReceivedEventPayload = { message_type: 'validated_transcription', data: mockTranscriptionData };
      handleReceivedData(palabraEventEmitter, payload);
      expect(palabraEventEmitter.emit).toHaveBeenCalledWith(EVENT_TRANSCRIPTION_RECEIVED, mockTranscriptionData);
    });

    it('should emit EVENT_PARTIAL_TRANSLATED_TRANSCRIPTION_RECEIVED for partial_translated_transcription', () => {
      const payload: DataReceivedEventPayload = { message_type: 'partial_translated_transcription', data: JSON.stringify(mockTranscriptionData) };
      handleReceivedData(palabraEventEmitter, payload);
      expect(palabraEventEmitter.emit).toHaveBeenCalledWith(EVENT_PARTIAL_TRANSLATED_TRANSCRIPTION_RECEIVED, mockTranscriptionData);
    });

    it('should emit EVENT_PARTIAL_TRANSCRIPTION_RECEIVED for partial_transcription', () => {
      const payload: DataReceivedEventPayload = { message_type: 'partial_transcription', data: mockTranscriptionData };
      handleReceivedData(palabraEventEmitter, payload);
      expect(palabraEventEmitter.emit).toHaveBeenCalledWith(EVENT_PARTIAL_TRANSCRIPTION_RECEIVED, mockTranscriptionData);
    });

    it('should emit EVENT_PIPELINE_TIMINGS_RECEIVED for pipeline_timings', () => {
      const payload: DataReceivedEventPayload = { message_type: 'pipeline_timings', data: JSON.stringify(mockPipelineTimings) };
      handleReceivedData(palabraEventEmitter, payload);
      expect(palabraEventEmitter.emit).toHaveBeenCalledWith(EVENT_PIPELINE_TIMINGS_RECEIVED, mockPipelineTimings);
    });

    it('should emit EVENT_ERROR_RECEIVED for error', () => {
      const payload: DataReceivedEventPayload = { message_type: 'error', data: JSON.stringify(mockErrorData) };
      handleReceivedData(palabraEventEmitter, payload);
      expect(palabraEventEmitter.emit).toHaveBeenCalledWith(EVENT_ERROR_RECEIVED, mockErrorData);
    });

    it('should not emit any event for an unknown message_type', () => {
      const payload: DataReceivedEventPayload = { message_type: 'unknown' as unknown, data: {} };
      handleReceivedData(palabraEventEmitter, payload);
      expect(palabraEventEmitter.emit).not.toHaveBeenCalled();
    });
  });
});