import { getApiKey, type AiProviderId } from './apiKeys';

export interface ChatTurn {
  role: 'user' | 'assistant';
  text: string;
}

/** Picks the first configured provider in priority order, or null if none is set up. */
export function getActiveAiProvider(): AiProviderId | null {
  const priorityOrder: AiProviderId[] = ['claude', 'openai', 'gemini'];
  return priorityOrder.find((p) => getApiKey(p)) ?? null;
}

export function getProviderDisplayName(provider: AiProviderId | null): string {
  switch (provider) {
    case 'claude':
      return 'Claude';
    case 'openai':
      return 'GPT-4o';
    case 'gemini':
      return 'Gemini';
    default:
      return 'ATO Lens Assistant';
  }
}

const CLAUDE_MODEL = 'claude-3-5-sonnet-20241022';
const OPENAI_MODEL = 'gpt-4o';
const GEMINI_MODEL = 'gemini-1.5-pro';

/**
 * Sends a chat message directly to the selected provider's API using the
 * user's own locally-stored API key. Throws on any failure so callers can
 * fall back to the fully offline assistant.
 */
export async function sendChatMessage(
  provider: AiProviderId,
  systemPrompt: string,
  history: ChatTurn[],
  message: string
): Promise<string> {
  const apiKey = getApiKey(provider);
  if (!apiKey) throw new Error(`No API key configured for ${provider}`);

  if (provider === 'claude') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [...history.map((h) => ({ role: h.role, content: h.text })), { role: 'user', content: message }]
      })
    });
    if (!res.ok) throw new Error(`Claude chat error ${res.status}`);
    const data = await res.json();
    return data?.content?.[0]?.text || 'No response received.';
  }

  if (provider === 'openai') {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          ...history.map((h) => ({ role: h.role, content: h.text })),
          { role: 'user', content: message }
        ]
      })
    });
    if (!res.ok) throw new Error(`OpenAI chat error ${res.status}`);
    const data = await res.json();
    return data?.choices?.[0]?.message?.content || 'No response received.';
  }

  // Gemini
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [
          ...history.map((h) => ({ role: h.role === 'assistant' ? 'model' : 'user', parts: [{ text: h.text }] })),
          { role: 'user', parts: [{ text: message }] }
        ]
      })
    }
  );
  if (!res.ok) throw new Error(`Gemini chat error ${res.status}`);
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response received.';
}
