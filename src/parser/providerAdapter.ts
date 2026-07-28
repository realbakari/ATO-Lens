import type { DocumentType } from '../types/tax';
import type { ExtractProgress } from './pdfExtract';

export interface ParsedField<T> {
  value: T;
  confidence: number;
  sourceText: string;
  sourcePage?: number;
}

export interface ParsedDocumentResult {
  documentType: DocumentType;
  financialYear: string;
  confidenceAverage: number;
  extractedFields: Record<string, ParsedField<any>>;
  rawText: string;
}

export interface DocumentParserProvider {
  providerId: 'rule_based' | 'claude' | 'openai' | 'gemini' | 'ollama';
  providerName: string;
  parseDocument(
    fileBuffer: ArrayBuffer,
    fileName: string,
    documentType?: DocumentType,
    /** Reports reading/recognition progress; OCR of a scan takes seconds. */
    onProgress?: ExtractProgress
  ): Promise<ParsedDocumentResult>;
}
