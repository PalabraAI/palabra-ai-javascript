import { PipelineConfigBuilder } from '~/config/PipelineConfigBuilder';
import { SourceLangCode } from '~/utils/source';
import { translation as defaultTranslation } from './PipelineDefaults';
import { AddTranslationArgs, AllowedMessageTypes, AvailablePaths, PipelineConfig, TypeOfPropertyByPath } from './PipelineConfig.model';
import { merge } from 'ts-deepmerge';

export class PipelineConfigManager<T = unknown> {
  private builder: PipelineConfigBuilder<T>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private extension?: {initialExtension?: T, translationExtension?: Record<string, any>};

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(extension?: {initialExtension?: T, translationExtension?: Record<string, any>}, type: 'webrtc' = 'webrtc') {
    this.builder = new PipelineConfigBuilder<T>(extension?.initialExtension);
    this.extension = extension;
    if (type === 'webrtc') {
      this.builder.useWebRTC();
    } else {
      this.builder.useWebSocket();
    }
  }

  public static fromConfig<E extends Record<string, unknown> = Record<string, unknown>>(
    config: PipelineConfig,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    extension: {initialExtension?: E, translationExtension?: Record<string, any>},
    type: 'webrtc' = 'webrtc',
  ): PipelineConfigManager<E>
  {
    const manager = new PipelineConfigManager<E>(extension, type);
    manager.builder = PipelineConfigBuilder.fromConfig(config, extension.initialExtension);
    return manager;
  }

  public setSourceLanguage(language: SourceLangCode): this {
    this.builder.setTranscriptionSourceLanguage(language);
    return this;
  }

  public addTranslationTarget(config: AddTranslationArgs): this {
    this.builder.addTranslation(merge(defaultTranslation, this.extension?.translationExtension, config) as unknown as AddTranslationArgs);
    return this;
  }

  public deleteTranslationTarget(targetLanguage: PipelineConfig['pipeline']['translations'][number]['target_language']): this {
    this.builder.deleteTranslation(targetLanguage);
    return this;
  }

  public setMessageTypes(types: AllowedMessageTypes[]): this {
    this.builder.setAllowedMessageTypes(types);
    return this;
  }

  public getConfig() {
    return this.builder.build();
  }

  public getJSON(): PipelineConfig['pipeline'] {
    return structuredClone(this.getConfig().pipeline);
  }

  public setJSON(newPipeline: PipelineConfig['pipeline'] & T): PipelineConfig['pipeline'] & T {
    return this.builder.setPipeline(newPipeline);
  }

  public restoreDefaults(): PipelineConfig['pipeline'] {
    this.builder.restoreDefaults();
    return structuredClone(this.getConfig().pipeline);
  }

  public setValue<P extends AvailablePaths<PipelineConfig['pipeline'] & T>>(path: P, value: TypeOfPropertyByPath<PipelineConfig['pipeline'] & T, P>) {
    return this.builder.setValue(path, value);
  }

  public getValue<P extends AvailablePaths<PipelineConfig['pipeline'] & T>>(path: P): TypeOfPropertyByPath<PipelineConfig['pipeline'] & T, P> {
    return this.builder.getValue(path);
  }
}