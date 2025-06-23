import { SourceLangCode } from '~/utils/source';

export interface StreamConfigBase {
  content_type: 'audio';
}

export interface StreamConfigWebRtc extends StreamConfigBase {
  source?: {
    type: 'webrtc';
  };
  target?: {
    type: 'webrtc';
  };
}

export interface StreamConfigWebSocket extends StreamConfigBase {
  source?: {
    type: 'ws';
    format: 'pcm_s16le';
    sample_rate: number;
    channels: number;
  };
  target?: {
    type: 'ws';
    format: 'pcm_s16le';
    sample_rate: number;
    channels: number;
  };
}

export type StreamConfig = StreamConfigWebRtc | StreamConfigWebSocket;

export interface PreprocessingConfig {
  enable_vad: boolean;
  vad_threshold: number;
  vad_left_padding: number;
  vad_right_padding: number;
  pre_vad_denoise: boolean;
  pre_vad_dsp: boolean;
  record_tracks: string[];
}

export interface SentenceSplitterConfig {
  enabled: boolean;
  splitter_model: 'auto' | string;
  advanced: {
    min_sentence_characters: number;
    min_sentence_seconds: number;
    min_split_interval: number;
    context_size: number;
    segments_after_restart: number;
    step_size: number;
    max_steps_without_eos: number;
    force_end_of_segment: number;
  };
}

export interface VerificationConfig {
  verification_model: 'auto' | string;
  allow_verification_glossaries: boolean;
  auto_transcription_correction: boolean;
  transcription_correction_style: string | null;
}

export interface TranscriptionAdvancedConfig {
  filler_phrases: {
    enabled: boolean;
    min_transcription_len: number;
    min_transcription_time: number;
    phrase_chance: number;
  };
  ignore_languages: SourceLangCode[];
}

export interface TranscriptionConfig {
  source_language: SourceLangCode;
  detectable_languages: SourceLangCode[];
  asr_model: 'auto' | string;
  denoise: 'none' | string;
  allow_hotwords_glossaries: boolean;
  supress_numeral_tokens: boolean;
  diarize_speakers: boolean;
  priority: 'normal' | string;
  min_alignment_score: number;
  max_alignment_cer: number;
  segment_confirmation_silence_threshold: number;
  only_confirm_by_silence: boolean;
  batched_inference: boolean;
  force_detect_language: boolean;
  calculate_voice_loudness: boolean;
  sentence_splitter: SentenceSplitterConfig;
  verification: VerificationConfig;
  advanced: TranscriptionAdvancedConfig;
}

export type AddTranslationArgs = Partial<Omit<TranslationConfig, 'target_language'>> & Pick<TranslationConfig, 'target_language'>;

export interface VoiceTimbreDetectionConfig {
  enabled: boolean;
  high_timbre_voices: string[];
  low_timbre_voices: string[];
}

export interface SpeechGenerationAdvancedConfig {
  f0_variance_factor: number;
  energy_variance_factor: number;
  with_custom_stress: boolean;
}

export interface SpeechGenerationConfig {
  tts_model: 'auto' | string;
  voice_cloning: boolean;
  voice_cloning_mode: 'static_10' | string;
  denoise_voice_samples: boolean;
  voice_id: string;
  voice_timbre_detection: VoiceTimbreDetectionConfig;
  speech_tempo_auto: boolean;
  speech_tempo_timings_factor: number;
  speech_tempo_adjustment_factor: number;
  advanced: SpeechGenerationAdvancedConfig;
}

export interface TranslationConfig {
  target_language: string;
  allowed_source_languages: string[];
  translation_model: 'auto' | 'alpha' | string;
  allow_translation_glossaries: boolean;
  style: string | null;
  translate_partial_transcriptions: boolean;
  advanced: Record<string, unknown>;
  speech_generation: SpeechGenerationConfig;
}

export interface TranslationQueueConfig {
  global:{
    desired_queue_level_ms: number;
    max_queue_level_ms: number;
    auto_tempo: boolean;
  }
}

export type AllowedMessageTypes = (string
  | 'translated_transcription'
  | 'partial_translated_transcription'
  | 'partial_transcription'
  | 'validated_transcription'
  | 'pipeline_timings');

export interface PipelineConfig {
  input_stream: StreamConfig;
  output_stream: StreamConfig;
  pipeline: {
    preprocessing: PreprocessingConfig;
    transcription: TranscriptionConfig;
    translations: TranslationConfig[];
    translation_queue_configs: TranslationQueueConfig;
    allowed_message_types: AllowedMessageTypes[];
  };
}