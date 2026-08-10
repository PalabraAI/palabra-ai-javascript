import { merge } from 'ts-deepmerge';
import {
  TtsConfig,
  TtsConfigPatch,
  TtsInitMessage,
  TtsOutputConfig,
  TtsVoiceOptions,
} from '~/tts/TtsConfig.model';
import {
  TTS_DEACCENT_STRENGTH_RANGE,
  TTS_SAMPLE_RATE_RANGE,
  TTS_VOICE_SPEED_RANGE,
  tts_config as defaultTtsConfig,
} from '~/tts/TtsDefaults';
import { TtsLangCode } from '~/tts/tts-languages';

const clamp = (value: number, range: { min: number, max: number }) => Math.max(range.min, Math.min(range.max, value));

export class TtsConfigManager {
  private config: TtsConfig;

  constructor(patch?: TtsConfigPatch) {
    this.config = this.mergeWithDefaults(patch);
  }

  public static fromConfig(config: TtsConfig): TtsConfigManager {
    return new TtsConfigManager(config);
  }

  private mergeWithDefaults(patch?: TtsConfigPatch): TtsConfig {
    const config = merge(defaultTtsConfig, patch ?? {}) as TtsConfig;
    return this.normalize(config);
  }

  private normalize(config: TtsConfig): TtsConfig {
    return {
      ...config,
      voice_options: {
        ...config.voice_options,
        speed: clamp(config.voice_options.speed, TTS_VOICE_SPEED_RANGE),
        deaccent_strength: clamp(config.voice_options.deaccent_strength, TTS_DEACCENT_STRENGTH_RANGE),
      },
      output: {
        ...config.output,
        sample_rate: Math.round(clamp(config.output.sample_rate, TTS_SAMPLE_RATE_RANGE)),
      },
    };
  }

  public setLanguage(language: TtsLangCode): this {
    this.config.language = language;
    return this;
  }

  public setModel(model: string): this {
    this.config.model = model;
    return this;
  }

  public setVoiceOptions(voiceOptions: Partial<TtsVoiceOptions>): this {
    this.config = this.normalize({
      ...this.config,
      voice_options: { ...this.config.voice_options, ...voiceOptions },
    });
    return this;
  }

  public setOutput(output: Partial<TtsOutputConfig>): this {
    this.config = this.normalize({
      ...this.config,
      output: { ...this.config.output, ...output },
    });
    return this;
  }

  public getConfig(): TtsConfig {
    return structuredClone(this.config);
  }

  public getInitMessage(): TtsInitMessage {
    return { type: 'init', ...this.getConfig() };
  }

  public getJSON(): TtsConfig {
    return this.getConfig();
  }

  public setJSON(config: TtsConfig): TtsConfig {
    this.config = this.normalize(structuredClone(config));
    return this.getConfig();
  }

  public restoreDefaults(): TtsConfig {
    this.config = this.mergeWithDefaults();
    return this.getConfig();
  }
}
