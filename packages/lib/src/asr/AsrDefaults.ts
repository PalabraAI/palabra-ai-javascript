import { AsrConfig } from '~/asr/AsrConfig.model';

/**
 * Realtime STT websocket endpoints
 * @link https://docs.palabra.ai/docs/streaming_api/realtime_stt
 */
export const ASR_WS_BASE_URL_EU = 'wss://stream.palabra.ai';
export const ASR_WS_BASE_URL_US = 'wss://stream.us.palabra.ai';
export const ASR_STREAM_PATH = '/asr/v1/speech-to-text/stream';


export const ASR_CHUNK_MS = 320;

export const ASR_CONNECTION_TIMEOUT_MS = 10000;

/**
 * Default STT config, `pcm_s16le` is the format recommended by the API
 * @link https://docs.palabra.ai/docs/streaming_api/realtime_stt
 */
export const asr_config: AsrConfig = {
  format: 'pcm_s16le',
  sample_rate: 16000,
  language: 'auto',
  translate_languages: [],
};
