import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setApiKey, type AiProviderId } from './apiKeys';
import { sendChatMessage, type ChatTurn } from './aiChatClient';

const providerResponse = {
  content: [{ text: 'ok' }],
  choices: [{ message: { content: 'ok' } }],
  candidates: [{ content: { parts: [{ text: 'ok' }] } }]
};

describe('sendChatMessage provider boundary', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => providerResponse
      }))
    );
  });

  it.each<AiProviderId>(['claude', 'openai', 'gemini'])(
    'redacts the complete %s request without mutating history',
    async (provider) => {
      setApiKey(provider, 'synthetic-test-key');
      const history: ChatTurn[] = [
        { role: 'user', text: 'My TFN is 123 456 789' },
        { role: 'assistant', text: 'You said Medicare number 1234 56789 1' }
      ];
      const original = structuredClone(history);

      await sendChatMessage(
        provider,
        'Account number 12345678',
        history,
        'Use BSB 123-456'
      );

      const fetchMock = vi.mocked(fetch);
      const init = fetchMock.mock.calls[0][1] as RequestInit;
      const body = String(init.body);
      expect(body).not.toMatch(/123 456 789|1234 56789 1|12345678|123-456/);
      expect(body).toMatch(/\*{3,}/);
      expect(history).toEqual(original);
    }
  );
});
