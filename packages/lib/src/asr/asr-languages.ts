/**
 * Languages supported by the realtime STT API
 * @link https://docs.palabra.ai/docs/streaming_api/realtime_stt
 */
export const asrLanguages = [
  {
    code: 'auto',
    label: 'Auto',
    flag: '',
    icon: '',
  },
  {
    code: 'ar',
    label: 'Arabic',
    flag: '🇸🇦',
    icon: 'flag:arab-1x1',
  },
  {
    code: 'zh',
    label: 'Chinese',
    flag: '🇨🇳',
    icon: 'flag:cn-1x1',
  },
  {
    code: 'nl',
    label: 'Dutch',
    flag: '🇳🇱',
    icon: 'flag:nl-1x1',
  },
  {
    code: 'en',
    label: 'English',
    flag: '🇺🇸',
    icon: 'flag:us-1x1',
  },
  {
    code: 'fr',
    label: 'French',
    flag: '🇫🇷',
    icon: 'flag:fr-1x1',
  },
  {
    code: 'de',
    label: 'German',
    flag: '🇩🇪',
    icon: 'flag:de-1x1',
  },
  {
    code: 'hi',
    label: 'Hindi',
    flag: '🇮🇳',
    icon: 'flag:in-1x1',
  },
  {
    code: 'it',
    label: 'Italian',
    flag: '🇮🇹',
    icon: 'flag:it-1x1',
  },
  {
    code: 'ja',
    label: 'Japanese',
    flag: '🇯🇵',
    icon: 'flag:jp-1x1',
  },
  {
    code: 'ko',
    label: 'Korean',
    flag: '🇰🇷',
    icon: 'flag:kr-1x1',
  },
  {
    code: 'pt',
    label: 'Portuguese',
    flag: '🇵🇹',
    icon: 'flag:pt-1x1',
  },
  {
    code: 'ru',
    label: 'Russian',
    flag: '🇷🇺',
    icon: 'flag:ru-1x1',
  },
  {
    code: 'es',
    label: 'Spanish',
    flag: '🇪🇸',
    icon: 'flag:es-1x1',
  },
] as const;

export type AsrLangCode = typeof asrLanguages[number]['code'];

export type AsrTargetLangCode = Exclude<AsrLangCode, 'auto'>;
