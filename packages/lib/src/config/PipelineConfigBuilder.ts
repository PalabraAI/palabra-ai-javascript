import {
  AddTranslationArgs,
  AllowedMessageTypes,
  AvailablePaths,
  PipelineConfig,
  PreprocessingConfig,
  TranscriptionConfig,
  TranslationConfig,
  TranslationQueueConfig,
  TypeOfPropertyByPath,
} from '~/config/PipelineConfig.model';
import {
  preprocessing,
  transcription,
  translation_queue_configs,
  allowed_message_types,
  translation,
} from '~/config/PipelineDefaults';
import { SourceLangCode } from '~/utils/source';
import { merge } from 'ts-deepmerge';

type BasePipeline = PipelineConfig['pipeline'];

type CombinedPipeline<T> = BasePipeline & T;

export class PipelineConfigBuilder<T = unknown> {
  private config: Omit<PipelineConfig, 'pipeline'> & { pipeline: CombinedPipeline<T> };
  protected extension: T;
  protected initialExtension: T;

  constructor(initialExtension?: T) {
    this.extension = structuredClone(initialExtension);
    this.initialExtension = structuredClone(initialExtension);
    this.config = this.getMergedConfig();
  }

  private getMergedConfig(restoreDefaults = false) {
    const baseConfig = this.getDefaultWebRtcConfig();

    const config = {
      ...baseConfig,
      pipeline: merge(baseConfig.pipeline, restoreDefaults ? this.initialExtension : this.extension) as CombinedPipeline<T>,
    };
    return config;
  }

  private getDefaultWebRtcConfig(): PipelineConfig {
    return {
      input_stream: {
        content_type: 'audio',
        source: {
          type: 'webrtc',
        },
      },
      output_stream: {
        content_type: 'audio',
        target: {
          type: 'webrtc',
        },
      },
      pipeline: {
        preprocessing,
        transcription,
        translations: [],
        translation_queue_configs,
        allowed_message_types,
      },
    };
  }

  private getDefaultWebSocketConfig(): PipelineConfig {
    return {
      input_stream: {
        content_type: 'audio',
        source: {
          type: 'ws',
          format: 'pcm_s16le',
          sample_rate: 24000,
          channels: 1,
        },
      },
      output_stream: {
        content_type: 'audio',
        target: {
          type: 'ws',
          format: 'pcm_s16le',
          sample_rate: 24000,
          channels: 1,
        },
      },
      pipeline: {
        preprocessing,
        transcription,
        translations: [],
        translation_queue_configs,
        allowed_message_types,
      },
    };
  }

  public restoreDefaults() {
    this.config = this.getMergedConfig(true);
    return this;
  }

  public useWebSocket(): this {
    const base = this.getDefaultWebSocketConfig();
    this.config = {
      ...base,
      pipeline: merge(base.pipeline, this.extension) as CombinedPipeline<T>,
    };
    return this;
  }

  public useWebRTC(): this {
    this.config = this.getMergedConfig();
    return this;
  }

  public setWebSocketFormat(
    sampleRate = 24000,
    channels = 1,
  ): this {
    if (this.config.input_stream.source?.type === 'ws') {
      this.config.input_stream.source = {
        type: 'ws',
        format: 'pcm_s16le',
        sample_rate: sampleRate,
        channels: channels,
      };
    }
    if (this.config.output_stream.target?.type === 'ws') {
      this.config.output_stream.target = {
        type: 'ws',
        format: 'pcm_s16le',
        sample_rate: sampleRate,
        channels: channels,
      };
    }
    return this;
  }

  /**
   * Set preprocessing config for pipeline
   * @param config - Partial<PreprocessingConfig>
   * @link https://docs.palabra.ai/docs/streaming_api/translation_settings_breakdown/#231-preprocessing
   * @returns this
   */
  public setPreprocessing(config: Partial<PreprocessingConfig>): this {
    this.config.pipeline.preprocessing = {
      ...this.config.pipeline.preprocessing,
      ...structuredClone(config),
    };
    return this;
  }

  /**
   * Set transcription config for pipeline
   * @param config - Partial<TranscriptionConfig>
   * @link https://docs.palabra.ai/docs/streaming_api/translation_settings_breakdown/#232-transcription
   * @returns this
   */
  public setTranscription(config: Partial<TranscriptionConfig>): this {
    this.config.pipeline.transcription = merge(this.config.pipeline.transcription, config);
    return this;
  }

  /**
   * Add translation config for pipeline
   * @param config - TranslationConfig
   * @link https://docs.palabra.ai/docs/streaming_api/translation_settings_breakdown/#233-translations
   * @returns this
   */
  public addTranslation(config: AddTranslationArgs): this {
    this.config.pipeline.translations.push(merge(translation, config) as TranslationConfig);
    return this;
  }

  public deleteTranslation(targetLanguage: PipelineConfig['pipeline']['translations'][number]['target_language']): this {
    this.config.pipeline.translations = this.config.pipeline.translations.filter(translation => translation.target_language !== targetLanguage);
    return this;
  }

  /**
   * Set translation queue config for pipeline
   * @param config - Partial<TranslationQueueConfig>
   * @link https://docs.palabra.ai/docs/streaming_api/translation_settings_breakdown/#24-translation_queue_configs
   * @returns this
   */
  public setTranslationQueue(config: Partial<TranslationQueueConfig>): this {
    this.config.pipeline.translation_queue_configs = merge(this.config.pipeline.translation_queue_configs, config);
    return this;
  }

  /**
   * Set allowed message types for pipeline
   * @param types - string[]
   * @link https://docs.palabra.ai/docs/streaming_api/translation_settings_breakdown/#25-allowed_message_types
   * @returns this
   */
  public setAllowedMessageTypes(types: AllowedMessageTypes[]): this {
    this.config.pipeline.allowed_message_types = types;
    return this;
  }

  /**
   * Set transcription source language
   * @param language - string
   * @link https://docs.palabra.ai/docs/streaming_api/translation_settings_breakdown/#232-transcription
   * @returns this
   */
  public setTranscriptionSourceLanguage(language: SourceLangCode): this {
    this.config.pipeline.transcription.source_language = language;
    return this;
  }

  /**
   * Set transcription detectable languages
   * @param languages - string[]
   * @link https://docs.palabra.ai/docs/streaming_api/translation_settings_breakdown/#232-transcription
   * @returns this
   */
  public setTranscriptionDetectableLanguages(languages: SourceLangCode[]): this {
    this.config.pipeline.transcription.detectable_languages = languages;
    return this;
  }

  public setPipeline(newPipeline: CombinedPipeline<T>): CombinedPipeline<T> {
    this.config.pipeline = structuredClone(newPipeline) as CombinedPipeline<T>;
    return structuredClone(this.config.pipeline);
  }

  /**
   * Build pipeline config
   * @returns PipelineConfig
   */
  public build(): PipelineConfig & { pipeline: CombinedPipeline<T> } {
    return structuredClone(this.config);
  }

  /**
   * Create pipeline config builder from config
   * @param config - PipelineConfig
   * @returns PipelineConfigBuilder
   */
  public static fromConfig<E extends Record<string, unknown> = Record<string, unknown>>(config: PipelineConfig, initialExtension?: E): PipelineConfigBuilder<E> {
    const builder = new PipelineConfigBuilder<E>(initialExtension);
    builder.config = {
      ...structuredClone(config),
      pipeline: merge(config.pipeline, initialExtension ?? {}) as CombinedPipeline<E>,
    };
    return builder;
  }

  public setValue<P extends AvailablePaths<PipelineConfig['pipeline'] & T>>(path: P, value: TypeOfPropertyByPath<PipelineConfig['pipeline'] & T, P>) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    let parentProp: PipelineConfig['pipeline'] = this.config.pipeline;
    keys.forEach((key, index) => {
      const nextKey = keys[index + 1];
      const isNextKeyNumeric = /^\d+$/.test(nextKey ?? lastKey);
      const isCurrentKeyNumeric = /^\d+$/.test(key);

      if (isCurrentKeyNumeric && !Array.isArray(parentProp)) {
        throw new Error(`Cannot set array index "${key}" on non-array at "${keys.slice(0, index).join('.')}"`);
      }

      if (parentProp[key] === undefined || parentProp[key] === null) {
        parentProp[key] = isNextKeyNumeric ? [] : {};
      }

      parentProp = parentProp[key];
    });

    parentProp[lastKey] = value;
    return this.config.pipeline;
  }

  public getValue<P extends AvailablePaths<PipelineConfig['pipeline'] & T>>(path: P): TypeOfPropertyByPath<PipelineConfig['pipeline'] & T, P> | undefined {
    return  path.split('.').reduce((acc, key) => !acc ? undefined : acc[key], this.config.pipeline);
  }
}