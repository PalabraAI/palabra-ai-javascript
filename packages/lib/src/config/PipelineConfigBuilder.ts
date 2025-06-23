import {
  AddTranslationArgs,
  AllowedMessageTypes,
  PipelineConfig,
  PreprocessingConfig,
  TranscriptionConfig,
  TranslationQueueConfig,
} from '~/config/PipelineConfig.model';
import { preprocessing, transcription, translation_queue_configs, allowed_message_types, translation } from '~/config/PipelineDefaults';
import { SourceLangCode } from '~/utils/source';

export class PipelineConfigBuilder {
  private config: PipelineConfig;

  constructor() {
    this.config = this.getDefaultWebRtcConfig();
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

  public useWebSocket(): this {
    this.config = this.getDefaultWebSocketConfig();
    return this;
  }

  public useWebRTC(): this {
    this.config = this.getDefaultWebRtcConfig();
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
      ...config,
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
    this.config.pipeline.transcription = {
      ...this.config.pipeline.transcription,
      ...config,
    };
    return this;
  }

  /**
   * Add translation config for pipeline
   * @param config - TranslationConfig
   * @link https://docs.palabra.ai/docs/streaming_api/translation_settings_breakdown/#233-translations
   * @returns this
   */
  public addTranslation(config: AddTranslationArgs): this {
    this.config.pipeline.translations.push({
      ...translation,
      ...config,
    });
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
    this.config.pipeline.translation_queue_configs = {
      ...this.config.pipeline.translation_queue_configs,
      ...config,
    };
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

  /**
   * Build pipeline config
   * @returns PipelineConfig
   */
  public build(): PipelineConfig {
    return { ...this.config };
  }

  /**
   * Create pipeline config builder from config
   * @param config - PipelineConfig
   * @returns PipelineConfigBuilder
   */
  public static fromConfig(config: PipelineConfig): PipelineConfigBuilder {
    const builder = new PipelineConfigBuilder();
    builder.config = { ...config };
    return builder;
  }
}