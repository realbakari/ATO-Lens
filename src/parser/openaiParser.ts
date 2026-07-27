import type { DocumentParserProvider, ParsedDocumentResult } from './providerAdapter';
import type { DocumentType } from '../types/tax';
import { getApiKey } from '../lib/apiKeys';
import { logNetworkActivity, redactSensitiveData } from '../storage/privacyLog';
import { LocalRuleBasedParser } from './ruleBasedParser';
import { EXTRACTION_SYSTEM_PROMPT, buildUserInstruction, parseModelJson, arrayBufferToBase64 } from './aiParserShared';

const OPENAI_MODEL = 'gpt-4o';

/**
 * Sends the uploaded document directly to OpenAI's Responses API from the
 * browser using the user's own API key (PDF input via `input_file`).
 */
export class OpenAIDocumentParser implements DocumentParserProvider {
  providerId = 'openai' as const;
  providerName = 'OpenAI (GPT-4o)';

  async parseDocument(
    fileBuffer: ArrayBuffer,
    fileName: string,
    documentType?: DocumentType
  ): Promise<ParsedDocumentResult> {
    const fallback = await new LocalRuleBasedParser().parseDocument(fileBuffer, fileName, documentType);
    const apiKey = getApiKey('openai');
    if (!apiKey) return fallback;

    try {
      const base64 = arrayBufferToBase64(fileBuffer);
      logNetworkActivity(
        'api.openai.com',
        `Uploaded ${fileName} for GPT-4o document extraction`,
        'allowed',
        fileBuffer.byteLength,
        // Original PDF bytes - not redacted. Only the response is.
        false
      );

      const res = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          input: [
            { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
            {
              role: 'user',
              content: [
                { type: 'input_file', filename: fileName, file_data: `data:application/pdf;base64,${base64}` },
                { type: 'input_text', text: buildUserInstruction(fileName, documentType) }
              ]
            }
          ]
        })
      });

      if (!res.ok) {
        throw new Error(`OpenAI API responded with ${res.status}`);
      }

      const data = await res.json();
      const text: string =
        data?.output_text ||
        data?.output?.flatMap((o: any) => o?.content || [])?.find((c: any) => c?.text)?.text ||
        '';
      return parseModelJson(redactSensitiveData(text), fallback);
    } catch (err) {
      console.warn('[ATO Lens] OpenAI document parsing failed, using local rule-based result instead:', err);
      return fallback;
    }
  }
}
