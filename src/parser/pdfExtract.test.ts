import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { ExtractedPage, OcrWord } from './pdfExtract';

let helpers: typeof import('./pdfExtract');

beforeAll(async () => {
  vi.stubGlobal('DOMMatrix', class DOMMatrix {});
  vi.stubGlobal('ImageData', class ImageData {});
  vi.stubGlobal('Path2D', class Path2D {});
  helpers = await import('./pdfExtract');
});

describe('OCR provenance helpers', () => {
  it('scores a field only from matching words on its source page', () => {
    const words: OcrWord[] = [
      { text: '$89,670', confidence: 0.98, pageNumber: 1 },
      { text: '$89,670', confidence: 0.52, pageNumber: 2 },
      { text: 'Taxable', confidence: 0.9, pageNumber: 2 },
      { text: 'income', confidence: 0.9, pageNumber: 2 }
    ];

    expect(helpers.confidenceForSnippet(words, 'Taxable income $89,670', 2)).toBeCloseTo(0.52);
  });

  it('finds provenance after normalising PDF and OCR whitespace', () => {
    const pages: ExtractedPage[] = [
      { pageNumber: 1, text: 'Cover page', source: 'text_layer' },
      {
        pageNumber: 2,
        text: 'Taxable\n income     $89,670',
        source: 'ocr'
      }
    ];

    expect(helpers.pageForSnippet(pages, 'Taxable income $89,670')).toBe(2);
  });
});
