import { allowed_message_types, preprocessing, transcription, translation, translation_queue_configs } from '~/config/PipelineDefaults';
import { describe, expect, it } from 'vitest';
import { PipelineConfigBuilder } from '~/config/PipelineConfigBuilder';
import { PipelineConfig } from '~/config/PipelineConfig.model';

describe('PipelineConfigBuilder WebRtc', () => {
  it('Default WebRTC config should match the default config', () => {
    const builder = new PipelineConfigBuilder();
    const config = builder.build();

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

  it('Set preprocessing config should update the config', () => {
    const builder = new PipelineConfigBuilder();
    builder.setPreprocessing({
      enable_vad: false,
    });
    const config = builder.build();
    expect(config.pipeline.preprocessing).toEqual({
      ...preprocessing,
      enable_vad: false,
    });
  });

  it('Set transcription config should update the config', () => {
    const builder = new PipelineConfigBuilder();
    builder.setTranscription({
      source_language: 'es',
    });
    const config = builder.build();
    expect(config.pipeline.transcription).toEqual({
      ...transcription,
      source_language: 'es',
    });
  });

  it('Add translation should add a new translation', () => {
    const builder = new PipelineConfigBuilder();
    builder.addTranslation({
      target_language: 'es',
    });
    const config = builder.build();
    expect(config.pipeline.translations).toEqual([
      {
        ...translation,
        target_language: 'es',
      },
    ]);
    expect(config.pipeline.translations).toHaveLength(1);
  });

  it('Delete translation should delete a translation', () => {
    const builder = new PipelineConfigBuilder();
    builder.addTranslation({
      target_language: 'es',
    });
    builder.addTranslation({
      target_language: 'en-us',
    });
    expect(builder.getValue('translations')).toHaveLength(2);
    builder.deleteTranslation('en-us');
    expect(builder.getValue('translations')).toHaveLength(1);
    expect(builder.getValue('translations')[0].target_language).toEqual('es');
  });

  it('Set translation queue config should update the config', () => {
    const builder = new PipelineConfigBuilder();
    builder.setTranslationQueue({
      global: {
        desired_queue_level_ms: 10000,
        max_queue_level_ms: 20000,
        auto_tempo: true,
        min_tempo: 1.0,
        max_tempo: 1.2,
      },
    });
    const config = builder.build();
    expect(config.pipeline.translation_queue_configs).toEqual({
      global: {
        ...translation_queue_configs.global,
        desired_queue_level_ms: 10000,
        max_queue_level_ms: 20000,
        auto_tempo: true,
        min_tempo: 1.0,
        max_tempo: 1.2,
      },
    });
  });

  it('Set allowed message types should update the config', () => {
    const builder = new PipelineConfigBuilder();
    builder.setAllowedMessageTypes(['translated_transcription', 'partial_translated_transcription', 'partial_transcription', 'validated_transcription']);
    const config = builder.build();
    expect(config.pipeline.allowed_message_types).toEqual(['translated_transcription', 'partial_translated_transcription', 'partial_transcription', 'validated_transcription']);
  });

  it('Set transcription source language should update the config', () => {
    const builder = new PipelineConfigBuilder();
    builder.setTranscriptionSourceLanguage('es');
    const config = builder.build();
    expect(config.pipeline.transcription.source_language).toEqual('es');
  });

  it('Set transcription detectable languages should update the config', () => {
    const builder = new PipelineConfigBuilder();
    builder.setTranscriptionDetectableLanguages(['es', 'en']);
    const config = builder.build();
    expect(config.pipeline.transcription.detectable_languages).toEqual(['es', 'en']);
  });
  it('From config should create a config builder', () => {
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
        allowed_message_types,
      },
    };
    const builder = PipelineConfigBuilder.fromConfig(config);
    const config2 = builder.build();
    expect(config2).toEqual(config);
  });
});


describe('PipelineConfigBuilder WebSocket', () => {
  it('Default WebSocket config should match the default config', () => {
    const builder = new PipelineConfigBuilder();
    builder.useWebSocket();
    const config = builder.build();
    expect(config).toEqual({
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
    });
  });
});

describe('PipelineConfigBuilder set and get', () => {
  it('setValue should work', () => {
    const builder = new PipelineConfigBuilder();
    builder.setValue('allowed_message_types', ['some_message_type']);
    const config = builder.build();
    expect(config.pipeline.allowed_message_types).toEqual(['some_message_type']);
  });

  it('getValue should work', () => {
    const builder = new PipelineConfigBuilder();
    builder.setValue('allowed_message_types', ['some_message_type']);
    expect(builder.getValue('allowed_message_types')).toEqual(['some_message_type']);
  });

  it('getValue undefined should return undefined', () => {
    const builder = new PipelineConfigBuilder();
    // @ts-expect-error - This is a test
    expect(builder.getValue('undefined_property')).toBeUndefined();
  });

  it('setValue & getValue should work with nested paths', () => {
    const builder = new PipelineConfigBuilder();
    builder.setValue('preprocessing.enable_vad', false);
    expect(builder.getValue('preprocessing.enable_vad')).toEqual(false);
  });
});