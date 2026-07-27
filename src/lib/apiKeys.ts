/**
 * Local-only API key storage for optional AI-assisted document parsing & chat.
 * Keys never leave the browser except in direct requests to the provider's own API.
 */
export type AiProviderId = 'claude' | 'openai' | 'gemini';

const KEY_STORAGE_MAP: Record<AiProviderId, string> = {
  claude: 'ato_lens_anthropic_key',
  openai: 'ato_lens_openai_key',
  gemini: 'ato_lens_gemini_key'
};

export const AI_PROVIDER_LABELS: Record<AiProviderId, string> = {
  claude: 'Anthropic Claude',
  openai: 'OpenAI GPT-4o',
  gemini: 'Google Gemini'
};

export function getApiKey(provider: AiProviderId): string {
  try {
    return localStorage.getItem(KEY_STORAGE_MAP[provider])?.trim() || '';
  } catch {
    return '';
  }
}

export function setApiKey(provider: AiProviderId, key: string): void {
  try {
    const trimmed = key.trim();
    if (trimmed) {
      localStorage.setItem(KEY_STORAGE_MAP[provider], trimmed);
    } else {
      localStorage.removeItem(KEY_STORAGE_MAP[provider]);
    }
  } catch {
    // Ignore storage errors (e.g. private browsing quota)
  }
}

export function hasApiKey(provider: AiProviderId): boolean {
  return getApiKey(provider).length > 0;
}

export function getConfiguredProviders(): AiProviderId[] {
  return (Object.keys(KEY_STORAGE_MAP) as AiProviderId[]).filter(hasApiKey);
}

/** Removes every stored provider key - part of wiping all local data. */
export function clearAllApiKeys(): void {
  (Object.keys(KEY_STORAGE_MAP) as AiProviderId[]).forEach((provider) => setApiKey(provider, ''));
}
