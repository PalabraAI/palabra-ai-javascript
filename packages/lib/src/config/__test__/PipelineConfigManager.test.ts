import { beforeEach, describe, expect, it } from 'vitest';
import { PipelineConfigManager } from '~/config/PipelineConfigManager';
import { preprocessing, transcription, translation_queue_configs, allowed_message_types } from '~/config/PipelineDefaults';
import { PipelineConfig } from '~/config/PipelineConfig.model';

describe('PipelineConfigManager', () => {
  let manager: PipelineConfigManager<{ ff: number }>;
  beforeEach(() => {
    manager = new PipelineConfigManager();
  });

  it('Should create a config manager with extensions', () => {
    const manager = new PipelineConfigManager({ initialExtension: { additional_config: 1 } });
    const config = manager.getConfig();
    expect(config).toEqual({
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
        additional_config: 1,
      },
    });
  });

  it('Should create a default config with WebRTC input and output', () => {
    const config = manager.getConfig();
    expect(config).toEqual({
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
    });
  });

  it('From config should create a config manager', () => {
    const config: PipelineConfig = {
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
        allowed_message_types: ['translated_transcription', 'partial_translated_transcription'],
      },
    };
    const manager = PipelineConfigManager.fromConfig(config, {}, 'webrtc');
    const config2 = manager.getConfig();
    expect(config2).toEqual(config);
  });

  it('Set source language should update the config', () => {
    manager.setSourceLanguage('es');
    const config = manager.getConfig();
    expect(config.pipeline.transcription.source_language).toEqual('es');
  });

  it('Add translation should add a new translation', () => {
    manager.addTranslationTarget({
      target_language: 'es',
    });
    const config = manager.getConfig();
    expect(config.pipeline.translations).toHaveLength(1);
  });

  it('Delete translation should delete a translation', () => {
    manager.addTranslationTarget({
      target_language: 'en-us',
    });
    manager.addTranslationTarget({
      target_language: 'fr',
    });
    expect(manager.getConfig().pipeline.translations).toHaveLength(2);

    manager.deleteTranslationTarget('fr');
    expect(manager.getConfig().pipeline.translations).toHaveLength(1);
  });

  it('Set message types should update the config', () => {
    manager.setMessageTypes(['translated_transcription']);
    const config = manager.getConfig();
    expect(config.pipeline.allowed_message_types).toEqual(['translated_transcription']);
  });

  it('getConfig should return the config', () => {
    const config = manager.getConfig();
    expect(config).toEqual({
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
    });
  });

  it('should restore defaults', () => {
    const manager = new PipelineConfigManager({ initialExtension: { preprocessing: { testProp: 111 } } });
    manager.setValue('preprocessing.testProp', 222);
    expect(manager.getValue('preprocessing.testProp')).toEqual(222);
    manager.restoreDefaults();
    expect(manager.getValue('preprocessing.testProp')).toEqual(111);
    const config = manager.getConfig();
    expect(config.pipeline.preprocessing.testProp).toEqual(111);
  });
});