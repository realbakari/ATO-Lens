import type { DocumentParserProvider, ParsedDocumentResult } from './providerAdapter';
import type { DocumentType } from '../types/tax';
import { getApiKey } from '../lib/apiKeys';
import { logNetworkActivity, redactSensitiveData } from '../storage/privacyLog';
import { LocalRuleBasedParser } from './ruleBasedParser';
import {
  EXTRACTION_SYSTEM_PROMPT,
  buildUserInstruction,
  parseModelJson,
  arrayBufferToBase64,
  documentMimeType
} from './aiParserShared';

const CLAUDE_MODEL = 'claude-3-5-sonnet-20241022';

/**
 * Sends the uploaded document directly to Anthropic's Messages API using the
 * user's own API key. No proxy server is involved.
 */
export class ClaudeDocumentParser implements DocumentParserProvider {
  providerId = 'claude' as const;
  providerName = 'Claude (Anthropic)';

  async parseDocument(
    fileBuffer: ArrayBuffer,
    fileName: string,
    documentType?: DocumentType
  ): Promise<ParsedDocumentResult> {
    const fallback = await new LocalRuleBasedParser().parseDocument(fileBuffer, fileName, documentType);
    const apiKey = getApiKey('claude');
    if (!apiKey) return fallback;
    const mimeType = documentMimeType(fileName);
    if (mimeType === 'text/plain') return fallback;

    try {
      const base64 = arrayBufferToBase64(fileBuffer);
      const attachment =
        mimeType.startsWith('image/')
          ? { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64 } }
          : {
              type: 'document',
              source: { type: 'base64', media_type: 'application/pdf', data: base64 }
            };
      logNetworkActivity(
        'api.anthropic.com',
        `Uploaded ${fileName} for Claude Sonnet document extraction`,
        'allowed',
        fileBuffer.byteLength,
        // The original document is sent as-is, so nothing in this payload has been
        // through redactSensitiveData(). Only the response is redacted.
        false
      );

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
          max_tokens: 2048,
          system: EXTRACTION_SYSTEM_PROMPT,
          messages: [
            {
              role: 'user',
              content: [
                attachment,
                { type: 'text', text: buildUserInstruction(fileName, documentType) }
              ]
            }
          ]
        })
      });

      if (!res.ok) {
        throw new Error(`Anthropic API responded with ${res.status}`);
      }

      const data = await res.json();
      const text: string = data?.content?.[0]?.text || '';
      return parseModelJson(redactSensitiveData(text), fallback);
    } catch (err) {
      console.warn('[ATO Lens] Claude document parsing failed, using local rule-based result instead:', err);
      return fallback;
    }
  }
}
