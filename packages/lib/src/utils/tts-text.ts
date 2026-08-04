import { TTS_MAX_TEXT_LENGTH } from '~/tts/TtsDefaults';

const splitLongWord = (word: string, maxLength: number): string[] => {
  const parts: string[] = [];

  for (let i = 0; i < word.length; i += maxLength) {
    parts.push(word.slice(i, i + maxLength));
  }

  return parts;
};

export const splitTextIntoChunks = (text: string, maxLength = TTS_MAX_TEXT_LENGTH): string[] => {
  const normalized = text.trim();

  if (!normalized) {
    return [];
  }

  if (normalized.length <= maxLength) {
    return [normalized];
  }

  const chunks: string[] = [];
  let chunk = '';

  normalized.split(/\s+/).forEach(word => {
    if (word.length > maxLength) {
      if (chunk) {
        chunks.push(chunk);
        chunk = '';
      }
      chunks.push(...splitLongWord(word, maxLength));
      return;
    }

    const candidate = chunk ? `${chunk} ${word}` : word;

    if (candidate.length > maxLength) {
      chunks.push(chunk);
      chunk = word;
      return;
    }

    chunk = candidate;
  });

  if (chunk) {
    chunks.push(chunk);
  }

  return chunks;
};
