// Single source of truth for credentials. One env var powers every example:
// - the translator clients take it as `userToken` (sent as `Authorization: Bearer <key>`),
// - the TTS/STT clients take it as `apiKey` (sent as the `?token=` query param).
export const apiKey: string = (import.meta.env.VITE_PALABRA_API_KEY ?? '').trim();

export const hasApiKey: boolean = apiKey.length > 0;

export const palabraAuth = { userToken: apiKey };

// Optional override for non-production environments; undefined falls back
// to https://api.palabra.ai inside the library.
export const apiBaseUrl: string | undefined = import.meta.env.VITE_PALABRA_ENDPOINT || undefined;
