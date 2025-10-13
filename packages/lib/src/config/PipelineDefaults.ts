import { PipelineConfig, PreprocessingConfig, TranscriptionConfig, TranslationConfig, TranslationQueueConfig } from '~/config/PipelineConfig.model';

/**
 * Default translation config
 * @link https://docs.palabra.ai/docs/streaming_api/translation_settings_breakdown/#233-translations
 */
export const translation: Omit<TranslationConfig, 'target_language'> = {
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
};

/**
 * Default preprocessing config
 * @link https://docs.palabra.ai/docs/streaming_api/translation_settings_breakdown/#231-preprocessing
 */
export const preprocessing: PreprocessingConfig = {
  enable_vad: true,
  vad_threshold: 0.5,
  vad_left_padding: 1,
  vad_right_padding: 1,
  pre_vad_denoise: false,
  pre_vad_dsp: true,
  record_tracks: [],
};

/**
 * Default transcription config
 * @link https://docs.palabra.ai/docs/streaming_api/translation_settings_breakdown/#232-transcription
 */
export const transcription: TranscriptionConfig = {
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
};


/**
 * Default translation queue configs
 * @link https://docs.palabra.ai/docs/streaming_api/translation_settings_breakdown/#24-translation_queue_configs
 */
export const translation_queue_configs: TranslationQueueConfig = {
  global: {
    desired_queue_level_ms: 5000,
    max_queue_level_ms: 20000,
    auto_tempo: true,
    min_tempo: 1.15,
    max_tempo: 1.45,
  },
};

/**
 * Default allowed message types
 * @link https://docs.palabra.ai/docs/streaming_api/translation_settings_breakdown/#25-allowed_message_types
 */
export const allowed_message_types: PipelineConfig['pipeline']['allowed_message_types'] = [
  'translated_transcription',
  'partial_translated_transcription',
  'partial_transcription',
  'validated_transcription',
];