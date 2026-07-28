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

const GEMINI_MODEL = 'gemini-1.5-pro';

/**
 * Sends the uploaded document directly to Google's Gemini generateContent API
 * from the browser using the user's own API key (file or image via inlineData).
 */
export class GeminiDocumentParser implements DocumentParserProvider {
  providerId = 'gemini' as const;
  providerName = 'Gemini (Google)';

  async parseDocument(
    fileBuffer: ArrayBuffer,
    fileName: string,
    documentType?: DocumentType
  ): Promise<ParsedDocumentResult> {
    const fallback = await new LocalRuleBasedParser().parseDocument(fileBuffer, fileName, documentType);
    const apiKey = getApiKey('gemini');
    if (!apiKey) return fallback;

    try {
      const base64 = arrayBufferToBase64(fileBuffer);
      const mimeType = documentMimeType(fileName);
      logNetworkActivity(
        'generativelanguage.googleapis.com',
        `Uploaded ${fileName} for Gemini 1.5 Pro document extraction`,
        'allowed',
        fileBuffer.byteLength,
        // Original document bytes - not redacted. Only the response is.
        false
      );

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: EXTRACTION_SYSTEM_PROMPT }] },
            contents: [
              {
                role: 'user',
                parts: [
                  { inlineData: { mimeType, data: base64 } },
                  { text: buildUserInstruction(fileName, documentType) }
                ]
              }
            ]
          })
        }
      );

      if (!res.ok) {
        throw new Error(`Gemini API responded with ${res.status}`);
      }

      const data = await res.json();
      const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return parseModelJson(redactSensitiveData(text), fallback);
    } catch (err) {
      console.warn('[ATO Lens] Gemini document parsing failed, using local rule-based result instead:', err);
      return fallback;
    }
  }
}
