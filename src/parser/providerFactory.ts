import type { DocumentParserProvider } from './providerAdapter';
import { LocalRuleBasedParser } from './ruleBasedParser';
import { ClaudeDocumentParser } from './claudeParser';
import { OpenAIDocumentParser } from './openaiParser';
import { GeminiDocumentParser } from './geminiParser';
import { hasApiKey } from '../lib/apiKeys';

export type ParserProviderId = DocumentParserProvider['providerId'];

export function getDocumentParser(providerId: ParserProviderId): DocumentParserProvider {
  switch (providerId) {
    case 'claude':
      return new ClaudeDocumentParser();
    case 'openai':
      return new OpenAIDocumentParser();
    case 'gemini':
      return new GeminiDocumentParser();
    case 'ollama':
    case 'rule_based':
    default:
      return new LocalRuleBasedParser();
  }
}

/** Whether the given provider needs (and is missing) an API key before it can run. */
export function isMissingApiKey(providerId: ParserProviderId): boolean {
  if (providerId === 'claude' || providerId === 'openai' || providerId === 'gemini') {
    return !hasApiKey(providerId);
  }
  return false;
}
