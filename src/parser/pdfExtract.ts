import * as pdfjs from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export type ExtractionSource = 'text_layer' | 'ocr' | 'plain_text' | 'none';

export interface OcrWord {
  text: string;
  /** 0-1 confidence for this individual word. */
  confidence: number;
  pageNumber: number;
}

export interface ExtractedPage {
  pageNumber: number;
  text: string;
  source: Exclude<ExtractionSource, 'none'>;
  ocrConfidence?: number;
  words?: OcrWord[];
}

export interface PdfExtraction {
  text: string;
  source: ExtractionSource;
  pageCount: number;
  pages: ExtractedPage[];
  /** Mean OCR word confidence across the page, 0-1. Only set when source is 'ocr'. */
  ocrConfidence?: number;
  /** Per-word confidences, so a figure can be scored on the words behind it. */
  words?: OcrWord[];
}

/**
 * Confidence for a specific snippet, from the words that produced it.
 *
 * A page-wide average is the wrong measure for a single figure: scanner noise
 * in a logo can sit at 0% and drag the mean well below the confidence of a
 * cleanly-read dollar amount.
 */
export function confidenceForSnippet(
  words: OcrWord[] | undefined,
  snippet: string,
  pageNumber?: number
): number | undefined {
  if (!words?.length) return undefined;

  const pageWords = pageNumber ? words.filter((word) => word.pageNumber === pageNumber) : words;
  const tokens = snippet.split(/\s+/).filter((t) => t.length > 1);
  const matched = tokens
    .map(
      (token) =>
        pageWords.find((word) => word.text === token) ??
        pageWords.find((word) => word.text.includes(token))
    )
    .filter((w): w is OcrWord => Boolean(w));

  if (!matched.length) return undefined;

  // What matters is whether the figure itself was read correctly. A misread
  // digit changes the number; a misread label still matches the pattern.
  const figures = matched.filter((w) => /\d/.test(w.text));
  const scored = figures.length ? figures : matched;

  return scored.reduce((sum, w) => sum + w.confidence, 0) / scored.length;
}

export function pageForSnippet(pages: ExtractedPage[] | undefined, snippet: string): number {
  if (!pages?.length || !snippet.trim()) return 1;
  const needle = snippet.replace(/\s+/g, ' ').trim().toLowerCase();
  return (
    pages.find((page) =>
      page.text.replace(/\s+/g, ' ').trim().toLowerCase().includes(needle)
    )?.pageNumber ?? 1
  );
}

export type ExtractProgress = (stage: string, percent?: number) => void;

/**
 * A page carrying fewer characters than this is treated as having no usable
 * text layer. Scanned notices of assessment typically yield zero, while a
 * genuine text PDF yields hundreds.
 */
const MIN_CHARS_PER_PAGE = 40;

/**
 * Tesseract "works best on images which have a DPI of at least 300 dpi"
 * (tesseract-ocr.github.io/tessdoc/ImproveQuality.html). PDF user units are
 * 72 per inch, so rendering below this measurably misreads digits - at 180 dpi
 * this sample notice read $10,573.15 as $40,573.15.
 */
const OCR_TARGET_DPI = 300;
const PDF_UNITS_PER_INCH = 72;

/** Tesseract mis-segments text that runs to the edge; a white margin fixes it. */
const OCR_BORDER_PX = 10;

/** Guard against a very large page producing a canvas the browser cannot hold. */
const MAX_OCR_PIXELS = 40_000_000;

/**
 * Resolves a file in public/ to an absolute URL. Relative paths are required
 * because the packaged desktop app loads over file://, and the URL has to be
 * absolute because the OCR worker resolves it from a different context.
 */
function assetUrl(relativePath: string): string {
  return new URL(`${import.meta.env.BASE_URL}${relativePath}`, document.baseURI).href;
}

function looksLikePdf(buffer: ArrayBuffer): boolean {
  const header = new TextDecoder('latin1').decode(buffer.slice(0, 5));
  return header === '%PDF-';
}

function imageMimeType(buffer: ArrayBuffer, fileName?: string): string | undefined {
  const bytes = new Uint8Array(buffer.slice(0, 16));
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return 'image/png';
  }
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp';
  }

  const extension = fileName?.toLowerCase().split('.').pop();
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg';
  if (extension === 'png') return 'image/png';
  if (extension === 'webp') return 'image/webp';
  return undefined;
}

/**
 * Reads a document's text: the embedded text layer when there is one, falling
 * back to on-device OCR for scans. Nothing is uploaded - the OCR engine and its
 * language data are bundled with the app.
 */
export async function extractDocumentText(
  buffer: ArrayBuffer,
  onProgress?: ExtractProgress,
  fileName?: string
): Promise<PdfExtraction> {
  if (!looksLikePdf(buffer)) {
    const mimeType = imageMimeType(buffer, fileName);
    if (mimeType) return runImageOcr(buffer, mimeType, onProgress);

    // Plain text or an unknown format; decode and let the caller decide.
    const text = new TextDecoder('utf-8').decode(buffer);
    return {
      text,
      source: text.trim() ? 'plain_text' : 'none',
      pageCount: 1,
      pages: text.trim() ? [{ pageNumber: 1, text, source: 'plain_text' }] : []
    };
  }

  onProgress?.('Reading document');
  const doc = await pdfjs.getDocument({
    // A copy: pdf.js transfers the buffer to its worker, which detaches the
    // caller's. The AI parsers read the same buffer after this runs, and an
    // upload would otherwise record a size of zero.
    data: new Uint8Array(buffer.slice(0)),
    // Scans are usually JPEG 2000 or JBIG2, which pdf.js decodes with
    // WebAssembly. Without these the image silently fails to paint and the page
    // renders as a blank sheet. All bundled locally - nothing is fetched.
    wasmUrl: assetUrl('pdfjs/wasm/'),
    iccUrl: assetUrl('pdfjs/iccs/'),
    cMapUrl: assetUrl('pdfjs/cmaps/'),
    cMapPacked: true,
    standardFontDataUrl: assetUrl('pdfjs/standard_fonts/')
  }).promise;
  const pageCount = doc.numPages;

  const textPages: string[] = [];
  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
    const page = await doc.getPage(pageNumber);
    const content = await page.getTextContent();
    textPages.push(
      content.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()
    );
  }

  const pagesNeedingOcr = textPages
    .map((text, index) => ({ text, pageNumber: index + 1 }))
    .filter((page) => page.text.length < MIN_CHARS_PER_PAGE)
    .map((page) => page.pageNumber);

  if (pagesNeedingOcr.length === 0) {
    const pages = textPages.map((text, index) => ({
      pageNumber: index + 1,
      text,
      source: 'text_layer' as const
    }));
    return { text: pages.map((page) => page.text).join('\n').trim(), source: 'text_layer', pageCount, pages };
  }

  const ocr = await runPdfOcr(doc, pagesNeedingOcr, pageCount, onProgress);
  const ocrByPage = new Map(ocr.pages.map((page) => [page.pageNumber, page]));
  const pages: ExtractedPage[] = textPages.map((text, index) => {
    const pageNumber = index + 1;
    return (
      ocrByPage.get(pageNumber) ?? {
        pageNumber,
        text,
        source: 'text_layer' as const
      }
    );
  });
  return {
    text: pages.map((page) => page.text).join('\n').trim(),
    source: 'ocr',
    pageCount,
    pages,
    ocrConfidence: ocr.ocrConfidence,
    words: ocr.words
  };
}

async function runPdfOcr(
  doc: pdfjs.PDFDocumentProxy,
  pageNumbers: number[],
  totalPageCount: number,
  onProgress?: ExtractProgress
): Promise<{ pages: ExtractedPage[]; ocrConfidence: number; words: OcrWord[] }> {
  return runOcr(
    pageNumbers,
    totalPageCount,
    (pageNumber) => renderPageToCanvas(doc, pageNumber),
    onProgress
  );
}

async function runImageOcr(
  buffer: ArrayBuffer,
  mimeType: string,
  onProgress?: ExtractProgress
): Promise<PdfExtraction> {
  const result = await runOcr(
    [1],
    1,
    () => renderImageToCanvas(buffer, mimeType),
    onProgress
  );
  return {
    text: result.pages[0]?.text ?? '',
    source: 'ocr',
    pageCount: 1,
    pages: result.pages,
    ocrConfidence: result.ocrConfidence,
    words: result.words
  };
}

async function runOcr(
  pageNumbers: number[],
  totalPageCount: number,
  renderPage: (pageNumber: number) => Promise<HTMLCanvasElement>,
  onProgress?: ExtractProgress
): Promise<{ pages: ExtractedPage[]; ocrConfidence: number; words: OcrWord[] }> {
  onProgress?.('Starting text recognition');

  // Loaded on demand so the ~4 MB OCR engine never enters the initial bundle.
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng', 1, {
    workerPath: assetUrl('ocr/worker.min.js'),
    corePath: assetUrl('ocr/tesseract-core-simd-lstm.wasm.js'),
    langPath: assetUrl('ocr/fast').replace(/\/$/, ''),
    gzip: false,
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'recognizing text') onProgress?.('Recognising text', m.progress * 100);
    }
  });

  try {
    const pages: ExtractedPage[] = [];
    const confidences: number[] = [];
    const words: OcrWord[] = [];

    for (const pageNumber of pageNumbers) {
      onProgress?.(`Recognising page ${pageNumber} of ${totalPageCount}`);
      const canvas = await renderPage(pageNumber);
      // Word-level output is opt-in, and it is what lets a figure be scored on
      // its own reading rather than the page average.
      const { data } = await worker.recognize(
        canvas,
        { rotateAuto: true },
        { text: true, blocks: true }
      );
      confidences.push(data.confidence);
      const pageWords: OcrWord[] = [];

      for (const block of data.blocks ?? []) {
        for (const paragraph of block.paragraphs ?? []) {
          for (const line of paragraph.lines ?? []) {
            for (const word of line.words ?? []) {
              const extractedWord = {
                text: word.text,
                confidence: word.confidence / 100,
                pageNumber
              };
              words.push(extractedWord);
              pageWords.push(extractedWord);
            }
          }
        }
      }

      pages.push({
        pageNumber,
        text: data.text.trim(),
        source: 'ocr',
        ocrConfidence: data.confidence / 100,
        words: pageWords
      });

      canvas.width = 0; // release the backing store promptly
      canvas.height = 0;
    }

    const mean = confidences.length
      ? confidences.reduce((sum, c) => sum + c, 0) / confidences.length / 100
      : 0;
    return { pages, ocrConfidence: mean, words };
  } finally {
    await worker.terminate();
  }
}

async function renderImageToCanvas(
  buffer: ArrayBuffer,
  mimeType: string
): Promise<HTMLCanvasElement> {
  const imageBuffer = new ArrayBuffer(buffer.byteLength);
  new Uint8Array(imageBuffer).set(new Uint8Array(buffer));
  const bitmap = await createImageBitmap(new Blob([imageBuffer], { type: mimeType }), {
    imageOrientation: 'from-image'
  });

  try {
    const pixels = bitmap.width * bitmap.height;
    const scale = pixels > MAX_OCR_PIXELS ? Math.sqrt(MAX_OCR_PIXELS / pixels) : 1;
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(bitmap.width * scale) + OCR_BORDER_PX * 2;
    canvas.height = Math.ceil(bitmap.height * scale) + OCR_BORDER_PX * 2;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not create a canvas for text recognition');

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(
      bitmap,
      OCR_BORDER_PX,
      OCR_BORDER_PX,
      bitmap.width * scale,
      bitmap.height * scale
    );
    return canvas;
  } finally {
    bitmap.close();
  }
}

async function renderPageToCanvas(
  doc: pdfjs.PDFDocumentProxy,
  pageNumber: number
): Promise<HTMLCanvasElement> {
  const page = await doc.getPage(pageNumber);

  const unscaled = page.getViewport({ scale: 1 });
  const targetScale = OCR_TARGET_DPI / PDF_UNITS_PER_INCH;
  const pixelsAtTarget = unscaled.width * targetScale * unscaled.height * targetScale;
  const scale =
    pixelsAtTarget > MAX_OCR_PIXELS
      ? targetScale * Math.sqrt(MAX_OCR_PIXELS / pixelsAtTarget)
      : targetScale;

  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(viewport.width) + OCR_BORDER_PX * 2;
  canvas.height = Math.ceil(viewport.height) + OCR_BORDER_PX * 2;

  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not create a canvas for text recognition');

  // Scans are photographed on white; filling first avoids transparent pixels
  // being read as black by the recogniser.
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);

  // pdf.js can resolve the render promise while a large embedded image is still
  // decoding ("Dependent image isn't ready yet"), leaving a blank canvas and
  // giving the recogniser nothing to read. Re-render until something is painted.
  context.translate(OCR_BORDER_PX, OCR_BORDER_PX);
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.render({ canvas, canvasContext: context, viewport }).promise;
    if (!isCanvasBlank(context, canvas)) break;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  context.setTransform(1, 0, 0, 1, 0, 0);

  return canvas;
}

/** Samples a coarse grid; a page that is entirely one colour has not painted. */
function isCanvasBlank(context: CanvasRenderingContext2D, canvas: HTMLCanvasElement): boolean {
  const stepX = Math.max(1, Math.floor(canvas.width / 40));
  const stepY = Math.max(1, Math.floor(canvas.height / 40));

  for (let y = 0; y < canvas.height; y += stepY) {
    const row = context.getImageData(0, y, canvas.width, 1).data;
    for (let x = 0; x < canvas.width; x += stepX) {
      const i = x * 4;
      if (row[i] < 250 || row[i + 1] < 250 || row[i + 2] < 250) return false;
    }
  }
  return true;
}
