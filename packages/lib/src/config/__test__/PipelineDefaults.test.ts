import { describe, expect, it } from 'vitest';
import * as configDefaults from '~/config/PipelineDefaults';
import { AllowedMessageTypes } from '~/config/PipelineConfig.model';

describe('PipelineDefaults', () => {
  it('Translation default object should match the default config', () => {
    expect(configDefaults.translation).toEqual({
      translate_partial_transcriptions: false,
      speech_generation: {
        voice_cloning: false,
        voice_id: 'default_low',
        voice_timbre_detection: {
          enabled: false,
          high_timbre_voices: ['default_high'],
          low_timbre_voices: ['default_low'],
        },
      },
    });
  });

  it('Preprocessing default object should match the default config', () => {
    expect(configDefaults.preprocessing).toEqual({
      enable_vad: true,
      vad_threshold: 0.5,
      vad_left_padding: 1,
      vad_right_padding: 1,
      pre_vad_denoise: false,
      pre_vad_dsp: true,
      record_tracks: [],
    });
  });

  it('Transcription default object should match the default config', () => {
    expect(configDefaults.transcription).toEqual({
      source_language: 'en',
      detectable_languages: [],
      segment_confirmation_silence_threshold: 0.7,
      sentence_splitter: {
        enabled: true,
      },
      verification: {
        auto_transcription_correction: false,
        transcription_correction_style: null,
      },
    });
  });

  it('Translation queue configs default object should match the default config', () => {
    expect(configDefaults.translation_queue_configs).toEqual({
      global: {
        desired_queue_level_ms: 10000,
        max_queue_level_ms: 24000,
        auto_tempo: true,
        min_tempo: 1.15,
        max_tempo: 1.45,
      },
    });
  });

  it('Allowed message types default object should match the default config', () => {
    expect(configDefaults.allowed_message_types).toEqual([
      'translated_transcription',
      'partial_translated_transcription',
      'partial_transcription',
      'validated_transcription',
    ]);
  });
  it('Allowed message types should only contain valid types', () => {
    const validTypes: AllowedMessageTypes[] = [
      'translated_transcription',
      'partial_translated_transcription',
      'partial_transcription',
      'validated_transcription',
      'pipeline_timings',
    ];

    configDefaults.allowed_message_types.forEach(type => {
      expect(validTypes).toContain(type);
    });
  });
});