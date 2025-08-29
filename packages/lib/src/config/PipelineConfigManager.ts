import { PipelineConfigBuilder } from '~/config/PipelineConfigBuilder';
import { SourceLangCode } from '~/utils/source';
import { translation as defaultTranslation } from './PipelineDefaults';
import { AddTranslationArgs, AllowedMessageTypes, AvailablePaths, PipelineConfig, TypeOfPropertyByPath } from './PipelineConfig.model';

export class PipelineConfigManager {
  private builder: PipelineConfigBuilder;

  constructor(type: 'webrtc' = 'webrtc') {
    this.builder = new PipelineConfigBuilder();
    if (type === 'webrtc') {
      this.builder.useWebRTC();
    } else {
      this.builder.useWebSocket();
    }
  }

  public static fromConfig(config: PipelineConfig, type: 'webrtc'): PipelineConfigManager {
    const manager = new PipelineConfigManager(type);
    manager.builder = PipelineConfigBuilder.fromConfig(config);
    return manager;
  }

  public setSourceLanguage(language: SourceLangCode): this {
    this.builder.setTranscriptionSourceLanguage(language);
    return this;
  }

  public addTranslationTarget(config: AddTranslationArgs): this {
    this.builder.addTranslation({
      ...defaultTranslation,
      ...config,
    });
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

  public getConfig(): PipelineConfig {
    return this.builder.build();
  }

  public getJSON(): PipelineConfig['pipeline'] {
    return structuredClone(this.getConfig().pipeline);
  }

  public setJSON(newPipeline: PipelineConfig['pipeline']): PipelineConfig['pipeline'] {
    return this.builder.setPipeline(newPipeline);
  }

  public restoreDefaults(): PipelineConfig['pipeline'] {
    this.builder.restoreDefaults();
    return structuredClone(this.getConfig().pipeline);
  }

  public setValue<P extends AvailablePaths<PipelineConfig['pipeline']>>(path: P, value: TypeOfPropertyByPath<PipelineConfig['pipeline'], P>) {
    return this.builder.setValue(path, value);
  }

  public getValue<P extends AvailablePaths<PipelineConfig['pipeline']>>(path: P): TypeOfPropertyByPath<PipelineConfig['pipeline'], P> {
    return this.builder.getValue(path);
  }
}