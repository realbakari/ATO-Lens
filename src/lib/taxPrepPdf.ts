import type { AustralianFinancialYear, TaxCopilotState } from '../types/tax';
import { buildTaxPrepSummary } from '../engine/taxCopilotReadiness';

interface PdfLineStyle {
  font: 'regular' | 'bold';
  size: number;
  leading: number;
  spaceBefore: number;
  color: [number, number, number];
}

interface PdfLine extends PdfLineStyle {
  text: string;
}

interface PositionedPdfLine extends PdfLine {
  y: number;
}

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_X = 50;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;
const CONTENT_TOP = 785;
const CONTENT_BOTTOM = 58;

const COLORS = {
  ink: [0.12, 0.14, 0.13] as [number, number, number],
  muted: [0.38, 0.41, 0.39] as [number, number, number],
  emerald: [0.04, 0.48, 0.31] as [number, number, number],
  amber: [0.64, 0.38, 0.04] as [number, number, number]
};

const BODY_STYLE: PdfLineStyle = {
  font: 'regular',
  size: 9.5,
  leading: 13,
  spaceBefore: 0,
  color: COLORS.ink
};

function normalisePdfText(value: string): string {
  return value
    .replace(/[–—]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/•/g, '*')
    .replace(/[^\x20-\x7E]/g, '');
}

function estimateTextWidth(value: string, size: number): number {
  return value.length * size * 0.51;
}

function wrapText(value: string, size: number): string[] {
  const normalised = normalisePdfText(value).trim();
  if (!normalised) return [''];

  const words = normalised.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && estimateTextWidth(candidate, size) > CONTENT_WIDTH) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }

  if (current) lines.push(current);
  return lines;
}

function styleSummaryLine(line: string, index: number): PdfLineStyle {
  if (index === 0) {
    return {
      font: 'bold',
      size: 21,
      leading: 28,
      spaceBefore: 0,
      color: COLORS.ink
    };
  }
  if (line.startsWith('Financial year:')) {
    return {
      font: 'regular',
      size: 10.5,
      leading: 16,
      spaceBefore: 1,
      color: COLORS.muted
    };
  }
  if (line.startsWith('Status:')) {
    return {
      font: 'bold',
      size: 10.5,
      leading: 16,
      spaceBefore: 1,
      color: COLORS.emerald
    };
  }
  if (
    line === 'Financial overview' ||
    line === 'Preparation checklist' ||
    line === 'Confirmed return fields' ||
    line === 'Outstanding items' ||
    line === 'Warnings'
  ) {
    return {
      font: 'bold',
      size: 13,
      leading: 18,
      spaceBefore: 12,
      color: line === 'Warnings' ? COLORS.amber : COLORS.ink
    };
  }
  if (line.startsWith('This local summary intentionally')) {
    return {
      font: 'regular',
      size: 8.5,
      leading: 12,
      spaceBefore: 12,
      color: COLORS.muted
    };
  }
  if (line.startsWith('Review and lodge only')) {
    return {
      font: 'bold',
      size: 8.5,
      leading: 12,
      spaceBefore: 0,
      color: COLORS.muted
    };
  }
  return BODY_STYLE;
}

function buildPdfLines(summary: string): PdfLine[] {
  const lines: PdfLine[] = [];

  summary.split('\n').forEach((line, index) => {
    if (!line.trim()) {
      lines.push({ ...BODY_STYLE, text: '', leading: 5 });
      return;
    }

    const style = styleSummaryLine(line, index);
    const wrapped = wrapText(line, style.size);
    wrapped.forEach((wrappedLine, wrappedIndex) => {
      lines.push({
        ...style,
        text: wrappedLine,
        spaceBefore: wrappedIndex === 0 ? style.spaceBefore : 0
      });
    });
  });

  return lines;
}

function paginate(lines: PdfLine[]): PositionedPdfLine[][] {
  const pages: PositionedPdfLine[][] = [[]];
  let pageIndex = 0;
  let y = CONTENT_TOP;

  for (const line of lines) {
    const requiredHeight = line.spaceBefore + line.leading;
    if (y - requiredHeight < CONTENT_BOTTOM && pages[pageIndex].length > 0) {
      pages.push([]);
      pageIndex += 1;
      y = CONTENT_TOP;
    }

    y -= line.spaceBefore;
    pages[pageIndex].push({ ...line, y });
    y -= line.leading;
  }

  return pages;
}

function escapePdfString(value: string): string {
  return normalisePdfText(value).replace(/([\\()])/g, '\\$1');
}

function renderTextLine(line: PositionedPdfLine): string {
  const font = line.font === 'bold' ? 'F2' : 'F1';
  const [red, green, blue] = line.color;
  return [
    'BT',
    `/${font} ${line.size} Tf`,
    `${red} ${green} ${blue} rg`,
    `${MARGIN_X} ${line.y} Td`,
    `(${escapePdfString(line.text)}) Tj`,
    'ET'
  ].join('\n');
}

function renderPage(
  lines: PositionedPdfLine[],
  pageNumber: number,
  pageCount: number,
  financialYearLabel: string
): string {
  const commands = [
    '0.04 0.48 0.31 rg',
    `0 ${PAGE_HEIGHT - 25} ${PAGE_WIDTH} 25 re f`,
    'BT',
    '/F2 9 Tf',
    '1 1 1 rg',
    `${MARGIN_X} ${PAGE_HEIGHT - 16} Td`,
    '(ATO LENS - TAX RETURN COPILOT) Tj',
    'ET',
    ...lines.filter((line) => line.text).map(renderTextLine),
    '0.82 0.84 0.83 RG',
    `${MARGIN_X} 42 m ${PAGE_WIDTH - MARGIN_X} 42 l S`,
    'BT',
    '/F1 7.5 Tf',
    '0.38 0.41 0.39 rg',
    `${MARGIN_X} 27 Td`,
    `(Generated locally for ${escapePdfString(financialYearLabel)}. Preparation only - not lodged.) Tj`,
    'ET',
    'BT',
    '/F1 7.5 Tf',
    '0.38 0.41 0.39 rg',
    `${PAGE_WIDTH - 82} 27 Td`,
    `(Page ${pageNumber} of ${pageCount}) Tj`,
    'ET'
  ];

  return commands.join('\n');
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

function assemblePdf(pageStreams: string[]): Uint8Array {
  const objects: string[] = [];
  const pageObjectIds: number[] = [];

  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
  objects[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';

  pageStreams.forEach((stream, index) => {
    const contentObjectId = 5 + index * 2;
    const pageObjectId = contentObjectId + 1;
    pageObjectIds.push(pageObjectId);
    objects[contentObjectId] = `<< /Length ${byteLength(stream)} >>\nstream\n${stream}\nendstream`;
    objects[pageObjectId] = [
      '<< /Type /Page',
      '/Parent 2 0 R',
      `/MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}]`,
      '/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >>',
      `/Contents ${contentObjectId} 0 R`,
      '>>'
    ].join('\n');
  });

  objects[2] = `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageObjectIds.length} >>`;

  let pdf = '%PDF-1.4\n% ATO Lens local preparation summary\n';
  const offsets: number[] = [0];

  for (let objectId = 1; objectId < objects.length; objectId += 1) {
    offsets[objectId] = byteLength(pdf);
    pdf += `${objectId} 0 obj\n${objects[objectId]}\nendobj\n`;
  }

  const xrefOffset = byteLength(pdf);
  pdf += `xref\n0 ${objects.length}\n`;
  pdf += '0000000000 65535 f \n';
  for (let objectId = 1; objectId < objects.length; objectId += 1) {
    pdf += `${String(offsets[objectId]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF\n`;

  return new TextEncoder().encode(pdf);
}

export function buildTaxPrepPdf(
  financialYear: AustralianFinancialYear,
  state: TaxCopilotState
): Uint8Array {
  const summary = buildTaxPrepSummary(financialYear, state);
  const pages = paginate(buildPdfLines(summary));
  const pageStreams = pages.map((page, index) =>
    renderPage(page, index + 1, pages.length, financialYear.label)
  );
  return assemblePdf(pageStreams);
}
