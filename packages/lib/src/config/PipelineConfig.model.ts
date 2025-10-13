import { SourceLangCode } from '~/utils/source';
import { TargetLangCode } from '~/utils/target';

export interface StreamConfigBase {
  content_type: 'audio';
}

export interface StreamConfigWebRtc extends StreamConfigBase {
  content_type: 'audio';
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
}

export interface VerificationConfig {
  auto_transcription_correction: boolean;
  transcription_correction_style: string | null;
}
export interface TranscriptionConfig {
  source_language: SourceLangCode;
  detectable_languages: SourceLangCode[];
  segment_confirmation_silence_threshold: number;
  sentence_splitter: SentenceSplitterConfig;
  verification: VerificationConfig;
}

export type AddTranslationArgs = Partial<Omit<TranslationConfig, 'target_language'>> & Pick<TranslationConfig, 'target_language'>;

export interface VoiceTimbreDetectionConfig {
  enabled: boolean;
  high_timbre_voices: string[];
  low_timbre_voices: string[];
}

export interface SpeechGenerationConfig {
  voice_cloning: boolean;
  voice_id: string;
  voice_timbre_detection: VoiceTimbreDetectionConfig;
}

export interface TranslationConfig {
  target_language: TargetLangCode;
  translate_partial_transcriptions: boolean;
  speech_generation: SpeechGenerationConfig;
}

export interface TranslationQueueConfig {
  global:{
    desired_queue_level_ms: number;
    max_queue_level_ms: number;
    auto_tempo: boolean;
    min_tempo: number;
    max_tempo: number;
  }
}

export type AllowedMessageTypes = (string
  | 'translated_transcription'
  | 'partial_translated_transcription'
  | 'partial_transcription'
  | 'validated_transcription');

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

export type TypeOfPropertyByPath<SourceObject, SourcePath extends string> =
SourceObject extends object
? (SourcePath extends `${infer FirstPart}.${infer Rest}` ? TypeOfPropertyByPath<PropertyType<SourceObject, FirstPart>, Rest> : PropertyType<SourceObject, SourcePath>)
: never;

export type PropertyType<SourceObject, Key extends string> =
  Key extends keyof SourceObject
    ? SourceObject[Key]
    : (
        Key extends `${number}`
          ? (
              number extends keyof SourceObject
                ? SourceObject[number]
                : never
            )
          : never
      );

export type AvailablePaths<SourceObject> = SourceObject extends object
      ? SourceObject extends (infer V)[]
        ? number extends keyof SourceObject
          ? `${number}` | `${number}.${AvailablePaths<V>}`
          : never
        : {
            [Key in keyof SourceObject & string]:
            SourceObject[Key] extends object
                ? Key | `${Key}.${AvailablePaths<SourceObject[Key]>}`
                : Key
          }[keyof SourceObject & string]
      : never;