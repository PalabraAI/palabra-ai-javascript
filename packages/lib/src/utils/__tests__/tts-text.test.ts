import { describe, it, expect } from 'vitest';
import { splitTextIntoChunks } from '../tts-text';
import { TTS_MAX_TEXT_LENGTH } from '~/tts/TtsDefaults';

describe('splitTextIntoChunks', () => {
  it('returns nothing for a blank text', () => {
    expect(splitTextIntoChunks('   ')).toEqual([]);
  });

  it('keeps a short text as a single chunk', () => {
    expect(splitTextIntoChunks('  Hello there  ')).toEqual(['Hello there']);
  });

  it('splits on word boundaries', () => {
    expect(splitTextIntoChunks('one two three four', 7)).toEqual(['one two', 'three', 'four']);
  });

  it('splits words that are longer than the limit', () => {
    expect(splitTextIntoChunks('ab abcdefgh', 4)).toEqual(['ab', 'abcd', 'efgh']);
  });

  it('never exceeds the api limit', () => {
    const text = 'palabra '.repeat(1000);
    const chunks = splitTextIntoChunks(text);

    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach(chunk => expect(chunk.length).toBeLessThanOrEqual(TTS_MAX_TEXT_LENGTH));
  });
});
