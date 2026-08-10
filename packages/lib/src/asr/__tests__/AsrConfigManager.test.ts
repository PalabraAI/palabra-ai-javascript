import { describe, it, expect } from 'vitest';
import { AsrConfigManager } from '../AsrConfigManager';
import { asr_config } from '../AsrDefaults';

describe('AsrConfigManager', () => {
  it('falls back to the defaults', () => {
    expect(new AsrConfigManager().getConfig()).toEqual(asr_config);
  });

  it('merges a partial config with the defaults', () => {
    const config = new AsrConfigManager({ language: 'de', translate_languages: ['es', 'fr'] }).getConfig();

    expect(config.language).toBe('de');
    expect(config.translate_languages).toEqual(['es', 'fr']);
    expect(config.format).toBe(asr_config.format);
  });

  it('builds the query for a raw audio format', () => {
    const params = new AsrConfigManager()
      .setLanguage('en')
      .setSampleRate(48000)
      .setTranslateLanguages(['es', 'de'])
      .setFillerFilter(false)
      .getQueryParams();

    expect(params).toEqual({
      format: 'pcm_s16le',
      sample_rate: '48000',
      language: 'en',
      translate_languages: 'es,de',
      enable_filler_filter: 'false',
    });
  });

  it('omits the optional query params', () => {
    expect(new AsrConfigManager().getQueryParams()).toEqual({
      format: 'pcm_s16le',
      sample_rate: '16000',
    });
  });

  it('skips the sample rate for container formats', () => {
    const manager = new AsrConfigManager().setFormat('webm');

    expect(manager.isRawAudioFormat()).toBe(false);
    expect(manager.getQueryParams()).toEqual({ format: 'webm' });
  });

  it('rounds the sample rate reported by the audio context', () => {
    expect(new AsrConfigManager().setSampleRate(44100.6).getConfig().sample_rate).toBe(44101);
  });

  it('does not leak the internal config', () => {
    const manager = new AsrConfigManager({ translate_languages: ['es'] });
    const config = manager.getConfig();

    config.translate_languages.push('de');

    expect(manager.getConfig().translate_languages).toEqual(['es']);
  });

  it('restores the defaults', () => {
    const manager = new AsrConfigManager().setLanguage('ja').setTranslateLanguages(['ko']);

    expect(manager.restoreDefaults()).toEqual(asr_config);
  });
});
