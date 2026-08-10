import { describe, it, expect, vi } from 'vitest';
import {
  filterAsrFinalTranscriptionData,
  filterAsrPartialTranscriptionData,
  filterAsrTranslatedTranscriptionData,
  handleReceivedAsrData,
} from '../asr-data-filters';
import {
  EVENT_ASR_PARTIAL_TRANSCRIPTION_RECEIVED,
  EVENT_ASR_TRANSCRIPTION_RECEIVED,
  EVENT_ASR_TRANSLATED_TRANSCRIPTION_RECEIVED,
} from '../../transport/PalabraAsrWebSocketTransport.model';
import { PalabraAsrBaseEventEmitter } from '../../PalabraAsrBaseEventEmitter';
import { AsrServerMessage } from '../asr-data-filters.model';

const message = (data: Partial<AsrServerMessage> = {}): AsrServerMessage => ({
  message_type: 'transcription',
  transcription_id: 'transcription-1',
  language: 'en',
  is_eos: false,
  segment: { text: 'hello there', start_time: 0, end_time: 1.2 },
  delta: { text: ' there', start_time: 0.6, end_time: 1.2 },
  ...data,
});

describe('asr-data-filters', () => {
  it('keeps partial and final transcriptions apart', () => {
    const partial = message();
    const final = message({ is_eos: true });

    expect(filterAsrPartialTranscriptionData(partial)).toBe(partial);
    expect(filterAsrPartialTranscriptionData(final)).toBeNull();

    expect(filterAsrFinalTranscriptionData(final)).toBe(final);
    expect(filterAsrFinalTranscriptionData(partial)).toBeNull();
  });

  it('filters translated transcriptions', () => {
    const translated = message({ message_type: 'translated_transcription', is_eos: true, language: 'es' });

    expect(filterAsrTranslatedTranscriptionData(translated)).toBe(translated);
    expect(filterAsrTranslatedTranscriptionData(message())).toBeNull();
  });

  it('emits the matching event for every message type', () => {
    const emitter = new PalabraAsrBaseEventEmitter();
    const onPartial = vi.fn();
    const onFinal = vi.fn();
    const onTranslated = vi.fn();

    emitter.on(EVENT_ASR_PARTIAL_TRANSCRIPTION_RECEIVED, onPartial);
    emitter.on(EVENT_ASR_TRANSCRIPTION_RECEIVED, onFinal);
    emitter.on(EVENT_ASR_TRANSLATED_TRANSCRIPTION_RECEIVED, onTranslated);

    handleReceivedAsrData(emitter, message());
    handleReceivedAsrData(emitter, message({ is_eos: true }));
    handleReceivedAsrData(emitter, message({ message_type: 'translated_transcription', is_eos: true }));

    expect(onPartial).toHaveBeenCalledTimes(1);
    expect(onFinal).toHaveBeenCalledTimes(1);
    expect(onTranslated).toHaveBeenCalledTimes(1);
  });
});
