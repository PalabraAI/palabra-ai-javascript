import { AsrConfigManager } from '~/asr/AsrConfigManager';
import { AsrLangCode, AsrTargetLangCode } from '~/asr/asr-languages';

export interface ApiKeyAsrAuth {
  apiKey: string;
}

export interface AsrSessionCredentials {
  streamUrl: string;
  token: string;
}

export interface PalabraAsrClientData {
  /** api key from https://platform.palabra.ai/api-keys */
  auth?: ApiKeyAsrAuth;
  createSession?: () => Promise<AsrSessionCredentials>;
  language?: AsrLangCode;
  translateLanguages?: AsrTargetLangCode[];
  enableFillerFilter?: boolean;
  handleOriginalTrack: () => Promise<MediaStreamTrack>;
  wsBaseUrl?: string;
  connectionTimeoutMs?: number;
  audioContext?: AudioContext;
  chunkMs?: number;
  configManager?: AsrConfigManager;
}
