import { TtsLangCode } from '~/tts/tts-languages';

export type TtsOutputFormat = 'pcm' | 'mp3' | 'wav';

export interface TtsVoiceOptions {
  voice_id: string;
  speed: number;
  deaccent_strength: number;
}

export interface TtsOutputConfig {
  format: TtsOutputFormat;
  sample_rate: number;
}

export interface TtsConfig {
  language: TtsLangCode;
  model: string;
  voice_options: TtsVoiceOptions;
  output: TtsOutputConfig;
}

export interface TtsConfigPatch {
  language?: TtsLangCode;
  model?: string;
  voice_options?: Partial<TtsVoiceOptions>;
  output?: Partial<TtsOutputConfig>;
}

export type TtsClientMessageType = 'init' | 'text' | 'cancel';

/**
 * Sent once right after the socket is opened
 */
export interface TtsInitMessage extends TtsConfig {
  type: 'init';
}

/**
 * Streams a text chunk, `TTS_MAX_TEXT_LENGTH` characters max
 */
export interface TtsTextMessage {
  type: 'text';
  text: string;
  is_eos?: boolean;
  generation_id?: string;
}

/**
 * Drops everything that is still being synthesized
 */
export interface TtsCancelMessage {
  type: 'cancel';
}

export type TtsClientMessage = TtsInitMessage | TtsTextMessage | TtsCancelMessage;
