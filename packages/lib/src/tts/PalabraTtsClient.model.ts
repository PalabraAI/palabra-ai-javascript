import { TtsConfigManager } from '~/tts/TtsConfigManager';
import { TtsOutputConfig, TtsVoiceOptions } from '~/tts/TtsConfig.model';
import { TtsLangCode } from '~/tts/tts-languages';

export interface ApiKeyAuth {
  apiKey: string;
}

export interface TtsSessionCredentials {
  streamUrl: string;
  token: string;
}

export interface PalabraTtsClientData {
  auth?: ApiKeyAuth;
  createSession?: () => Promise<TtsSessionCredentials>;
  language: TtsLangCode;
  model?: string;
  voiceOptions?: Partial<TtsVoiceOptions>;
  output?: Partial<TtsOutputConfig>;
  /** defaults to `TTS_WS_BASE_URL_EU`, pass `TTS_WS_BASE_URL_US` for the US region */
  wsBaseUrl?: string;
  connectionTimeoutMs?: number;
  audioContext?: AudioContext;
  /** skip the playback chain and only emit audio chunks */
  ignoreAudioContext?: boolean;
  configManager?: TtsConfigManager;
}

export interface TtsSpeakOptions {
  /** correlation id echoed back in every audio chunk, generated when omitted */
  generationId?: string;
  /** pass `false` while streaming a sentence in parts, `true` finalizes the synthesis */
  isEos?: boolean;
}
