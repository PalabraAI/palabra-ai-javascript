/**
 * Languages supported by the realtime TTS API
 * @link https://docs.palabra.ai/docs/streaming_api/realtime_tts
 */
export const ttsLanguages = [
  {
    code: 'en',
    label: 'English',
    flag: '🇺🇸',
    icon: 'flag:us-1x1',
  },
  {
    code: 'en-us',
    label: 'English (US)',
    flag: '🇺🇸',
    icon: 'flag:us-1x1',
  },
  {
    code: 'en-gb',
    label: 'English (UK)',
    flag: '🇬🇧',
    icon: 'flag:gb-1x1',
  },
  {
    code: 'cs',
    label: 'Czech',
    flag: '🇨🇿',
    icon: 'flag:cz-1x1',
  },
  {
    code: 'de',
    label: 'German',
    flag: '🇩🇪',
    icon: 'flag:de-1x1',
  },
  {
    code: 'es',
    label: 'Spanish',
    flag: '🇪🇸',
    icon: 'flag:es-1x1',
  },
  {
    code: 'es-eu',
    label: 'Spanish (Spain)',
    flag: '🇪🇸',
    icon: 'flag:es-1x1',
  },
  {
    code: 'es-la',
    label: 'Spanish (Latin America)',
    flag: '🇲🇽',
    icon: 'flag:mx-1x1',
  },
  {
    code: 'fi',
    label: 'Finnish',
    flag: '🇫🇮',
    icon: 'flag:fi-1x1',
  },
  {
    code: 'fr',
    label: 'French',
    flag: '🇫🇷',
    icon: 'flag:fr-1x1',
  },
  {
    code: 'fr-eu',
    label: 'French (France)',
    flag: '🇫🇷',
    icon: 'flag:fr-1x1',
  },
  {
    code: 'fr-ca',
    label: 'French (Canada)',
    flag: '🇨🇦',
    icon: 'flag:ca-1x1',
  },
  {
    code: 'hi',
    label: 'Hindi',
    flag: '🇮🇳',
    icon: 'flag:in-1x1',
  },
  {
    code: 'id',
    label: 'Indonesian',
    flag: '🇮🇩',
    icon: 'flag:id-1x1',
  },
  {
    code: 'it',
    label: 'Italian',
    flag: '🇮🇹',
    icon: 'flag:it-1x1',
  },
  {
    code: 'ko',
    label: 'Korean',
    flag: '🇰🇷',
    icon: 'flag:kr-1x1',
  },
  {
    code: 'nl',
    label: 'Dutch',
    flag: '🇳🇱',
    icon: 'flag:nl-1x1',
  },
  {
    code: 'pl',
    label: 'Polish',
    flag: '🇵🇱',
    icon: 'flag:pl-1x1',
  },
  {
    code: 'pt',
    label: 'Portuguese',
    flag: '🇵🇹',
    icon: 'flag:pt-1x1',
  },
  {
    code: 'pt-eu',
    label: 'Portuguese (Portugal)',
    flag: '🇵🇹',
    icon: 'flag:pt-1x1',
  },
  {
    code: 'pt-la',
    label: 'Portuguese (Brazil)',
    flag: '🇧🇷',
    icon: 'flag:br-1x1',
  },
  {
    code: 'ro',
    label: 'Romanian',
    flag: '🇷🇴',
    icon: 'flag:ro-1x1',
  },
  {
    code: 'ru',
    label: 'Russian',
    flag: '🇷🇺',
    icon: 'flag:ru-1x1',
  },
  {
    code: 'sk',
    label: 'Slovak',
    flag: '🇸🇰',
    icon: 'flag:sk-1x1',
  },
  {
    code: 'sv',
    label: 'Swedish',
    flag: '🇸🇪',
    icon: 'flag:se-1x1',
  },
  {
    code: 'tr',
    label: 'Turkish',
    flag: '🇹🇷',
    icon: 'flag:tr-1x1',
  },
] as const;

export type TtsLangCode = typeof ttsLanguages[number]['code'];
