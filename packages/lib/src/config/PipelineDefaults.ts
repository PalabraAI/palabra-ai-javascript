import { PipelineConfig, PreprocessingConfig, TranscriptionConfig, TranslationConfig, TranslationQueueConfig } from '~/config/PipelineConfig.model';

/**
 * Default translation config
 * @link https://docs.palabra.ai/docs/streaming_api/translation_settings_breakdown/#233-translations
 */
export const translation: Omit<TranslationConfig, 'target_language'> = {
  allowed_source_languages: [],
  translation_model: 'auto',
  allow_translation_glossaries: true,
  style: null,
  translate_partial_transcriptions: false,
  advanced: {},
  speech_generation: {
    tts_model: 'auto',
    voice_cloning: false,
    voice_cloning_mode: 'static_10',
    denoise_voice_samples: true,
    voice_id: 'default_low',
    voice_timbre_detection: {
      enabled: false,
      high_timbre_voices: ['default_high'],
      low_timbre_voices: ['default_low'],
    },
    speech_tempo_auto: true,
    speech_tempo_timings_factor: 0,
    speech_tempo_adjustment_factor: 0.75,
    advanced: {
      f0_variance_factor: 1.2,
      energy_variance_factor: 1.5,
      with_custom_stress: true,
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
  asr_model: 'auto',
  denoise: 'none',
  allow_hotwords_glossaries: true,
  supress_numeral_tokens: false,
  diarize_speakers: false,
  priority: 'normal',
  min_alignment_score: 0.2,
  max_alignment_cer: 0.8,
  segment_confirmation_silence_threshold: 0.7,
  only_confirm_by_silence: false,
  batched_inference: false,
  force_detect_language: false,
  calculate_voice_loudness: false,
  sentence_splitter: {
    enabled: true,
    splitter_model: 'auto',
    advanced: {
      min_sentence_characters: 80,
      min_sentence_seconds: 4,
      min_split_interval: 0.6,
      context_size: 30,
      segments_after_restart: 15,
      step_size: 5,
      max_steps_without_eos: 3,
      force_end_of_segment: 0.5,
    },
  },
  verification: {
    verification_model: 'auto',
    allow_verification_glossaries: true,
    auto_transcription_correction: false,
    transcription_correction_style: null,
  },
  advanced: {
    filler_phrases: {
      enabled: false,
      min_transcription_len: 40,
      min_transcription_time: 3,
      phrase_chance: 0.5,
    },
    ignore_languages: [],
  },
};


/**
 * Default translation queue configs
 * @link https://docs.palabra.ai/docs/streaming_api/translation_settings_breakdown/#24-translation_queue_configs
 */
export const translation_queue_configs: TranslationQueueConfig = {
  global: {
    desired_queue_level_ms: 8000,
    max_queue_level_ms: 24000,
    auto_tempo: false,
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
  'pipeline_timings',
];