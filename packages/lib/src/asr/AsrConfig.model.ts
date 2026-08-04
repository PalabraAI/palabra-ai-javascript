import { AsrLangCode, AsrTargetLangCode } from '~/asr/asr-languages';

/**
 * Audio encodings accepted by the realtime STT API
 * @link https://docs.palabra.ai/docs/streaming_api/realtime_stt
 */
export type AsrAudioFormat =
  | 'pcm_s16le'
  | 'pcm_f32le'
  | 'pcm_f32be'
  | 'pcm_s32le'
  | 'pcm_s32be'
  | 'mulaw'
  | 'alaw'
  | 'webm'
  | 'mp3'
  | 'aac'
  | 'ogg'
  | 'flac'
  | 'wav';

export const ASR_RAW_AUDIO_FORMATS: AsrAudioFormat[] = [
  'pcm_s16le',
  'pcm_f32le',
  'pcm_f32be',
  'pcm_s32le',
  'pcm_s32be',
  'mulaw',
  'alaw',
];

export interface AsrConfig {
  format: AsrAudioFormat;
  sample_rate: number;
  language: AsrLangCode;
  translate_languages: AsrTargetLangCode[];
  enable_filler_filter?: boolean;
}

export interface AsrConfigPatch {
  format?: AsrAudioFormat;
  sample_rate?: number;
  language?: AsrLangCode;
  translate_languages?: AsrTargetLangCode[];
  enable_filler_filter?: boolean;
}
