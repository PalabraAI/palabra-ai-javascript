import { merge } from 'ts-deepmerge';
import { ASR_RAW_AUDIO_FORMATS, AsrAudioFormat, AsrConfig, AsrConfigPatch } from '~/asr/AsrConfig.model';
import { asr_config as defaultAsrConfig } from '~/asr/AsrDefaults';
import { AsrLangCode, AsrTargetLangCode } from '~/asr/asr-languages';

export class AsrConfigManager {
  private config: AsrConfig;

  constructor(patch?: AsrConfigPatch) {
    this.config = this.mergeWithDefaults(patch);
  }

  public static fromConfig(config: AsrConfig): AsrConfigManager {
    return new AsrConfigManager(config);
  }

  private mergeWithDefaults(patch?: AsrConfigPatch): AsrConfig {
    const config = merge(defaultAsrConfig, patch ?? {}) as AsrConfig;

    return {
      ...config,
      translate_languages: patch?.translate_languages ?? [...defaultAsrConfig.translate_languages],
    };
  }

  public setLanguage(language: AsrLangCode): this {
    this.config.language = language;
    return this;
  }

  public setFormat(format: AsrAudioFormat): this {
    this.config.format = format;
    return this;
  }

  public setSampleRate(sampleRate: number): this {
    this.config.sample_rate = Math.round(sampleRate);
    return this;
  }

  public setTranslateLanguages(languages: AsrTargetLangCode[]): this {
    this.config.translate_languages = [...languages];
    return this;
  }

  public setFillerFilter(enabled: boolean): this {
    this.config.enable_filler_filter = enabled;
    return this;
  }

  public isRawAudioFormat(): boolean {
    return ASR_RAW_AUDIO_FORMATS.includes(this.config.format);
  }

  public getQueryParams(): Record<string, string> {
    const { format, sample_rate, language, translate_languages, enable_filler_filter } = this.config;

    const params: Record<string, string> = { format };

    if (this.isRawAudioFormat()) {
      params.sample_rate = String(sample_rate);
    }

    if (language && language !== 'auto') {
      params.language = language;
    }

    if (translate_languages.length) {
      params.translate_languages = translate_languages.join(',');
    }

    if (enable_filler_filter !== undefined) {
      params.enable_filler_filter = String(enable_filler_filter);
    }

    return params;
  }

  public getConfig(): AsrConfig {
    return structuredClone(this.config);
  }

  public getJSON(): AsrConfig {
    return this.getConfig();
  }

  public setJSON(config: AsrConfig): AsrConfig {
    this.config = structuredClone(config);
    return this.getConfig();
  }

  public restoreDefaults(): AsrConfig {
    this.config = this.mergeWithDefaults();
    return this.getConfig();
  }
}
