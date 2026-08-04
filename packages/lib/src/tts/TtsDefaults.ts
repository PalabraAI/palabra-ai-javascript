import { TtsConfig, TtsOutputConfig, TtsVoiceOptions } from '~/tts/TtsConfig.model';

/**
 * Realtime TTS websocket endpoints
 * @link https://docs.palabra.ai/docs/streaming_api/realtime_tts
 */
export const TTS_WS_BASE_URL_EU = 'wss://stream.palabra.ai';
export const TTS_WS_BASE_URL_US = 'wss://stream.us.palabra.ai';
export const TTS_STREAM_PATH = '/tts-api/v1/text-to-speech/stream';

/**
 * A single `text` message accepts 1024 characters max
 */
export const TTS_MAX_TEXT_LENGTH = 1024;

/**
 * The API allows 50 `text` messages per second, otherwise it answers with `RATE_LIMIT_EXCEEDED`
 */
export const TTS_MAX_MESSAGES_PER_SECOND = 50;
export const TTS_MIN_SEND_INTERVAL_MS = Math.ceil(1000 / TTS_MAX_MESSAGES_PER_SECOND);

export const TTS_CONNECTION_TIMEOUT_MS = 10000;

/**
 * Amount of audio (in seconds) buffered before the first chunk starts playing
 */
export const TTS_INITIAL_PLAYBACK_DELAY = 0.1;

export const TTS_VOICE_SPEED_RANGE = { min: 0.0, max: 2.0 };
export const TTS_DEACCENT_STRENGTH_RANGE = { min: 0.0, max: 1.0 };
export const TTS_SAMPLE_RATE_RANGE = { min: 8000, max: 48000 };

/**
 * Default voice options
 * @link https://docs.palabra.ai/docs/streaming_api/realtime_tts
 */
export const tts_voice_options: TtsVoiceOptions = {
  voice_id: 'default_low',
  speed: 1.0,
  deaccent_strength: 1.0,
};

/**
 * Default output settings, `pcm` is the only format that can be played chunk by chunk
 * @link https://docs.palabra.ai/docs/streaming_api/realtime_tts
 */
export const tts_output: TtsOutputConfig = {
  format: 'pcm',
  sample_rate: 24000,
};

/**
 * Default TTS config
 * @link https://docs.palabra.ai/docs/streaming_api/realtime_tts
 */
export const tts_config: TtsConfig = {
  language: 'en',
  model: 'auto',
  voice_options: tts_voice_options,
  output: tts_output,
};
