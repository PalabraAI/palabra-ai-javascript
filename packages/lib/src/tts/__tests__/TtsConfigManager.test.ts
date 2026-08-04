import { describe, it, expect } from 'vitest';
import { TtsConfigManager } from '../TtsConfigManager';
import { tts_config } from '../TtsDefaults';

describe('TtsConfigManager', () => {
  it('falls back to the defaults', () => {
    expect(new TtsConfigManager().getConfig()).toEqual(tts_config);
  });

  it('merges a partial config with the defaults', () => {
    const config = new TtsConfigManager({
      language: 'ru',
      voice_options: { voice_id: 'default_high' },
      output: { format: 'mp3' },
    }).getConfig();

    expect(config.language).toBe('ru');
    expect(config.model).toBe(tts_config.model);
    expect(config.voice_options).toEqual({
      voice_id: 'default_high',
      speed: tts_config.voice_options.speed,
      deaccent_strength: tts_config.voice_options.deaccent_strength,
    });
    expect(config.output).toEqual({ format: 'mp3', sample_rate: tts_config.output.sample_rate });
  });

  it('clamps the values to the ranges supported by the api', () => {
    const config = new TtsConfigManager()
      .setVoiceOptions({ speed: 5, deaccent_strength: -1 })
      .setOutput({ sample_rate: 96000 })
      .getConfig();

    expect(config.voice_options.speed).toBe(2);
    expect(config.voice_options.deaccent_strength).toBe(0);
    expect(config.output.sample_rate).toBe(48000);
  });

  it('builds the init message', () => {
    const manager = new TtsConfigManager({ language: 'de' }).setModel('custom-model');

    expect(manager.getInitMessage()).toEqual({
      type: 'init',
      ...manager.getConfig(),
    });
    expect(manager.getInitMessage().model).toBe('custom-model');
  });

  it('does not leak the internal config', () => {
    const manager = new TtsConfigManager();
    const config = manager.getConfig();

    config.voice_options.speed = 0.1;

    expect(manager.getConfig().voice_options.speed).toBe(tts_config.voice_options.speed);
  });

  it('replaces and restores the config', () => {
    const manager = new TtsConfigManager();

    manager.setJSON({
      language: 'tr',
      model: 'auto',
      voice_options: { voice_id: 'default_high', speed: 1.5, deaccent_strength: 0.5 },
      output: { format: 'wav', sample_rate: 16000 },
    });

    expect(manager.getJSON().language).toBe('tr');

    expect(manager.restoreDefaults()).toEqual(tts_config);
  });

  it('is created from a full config', () => {
    const manager = TtsConfigManager.fromConfig({
      language: 'pl',
      model: 'auto',
      voice_options: { voice_id: 'default_low', speed: 1, deaccent_strength: 1 },
      output: { format: 'pcm', sample_rate: 24000 },
    });

    expect(manager.getConfig().language).toBe('pl');
  });
});
