import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getDocumentParser } from '../../parser/providerFactory';
import type { ParsedDocumentResult } from '../../parser/providerAdapter';
import { UploadModal } from './UploadModal';

vi.mock('../../parser/providerFactory', () => ({
  getDocumentParser: vi.fn(),
  isMissingApiKey: vi.fn(() => false)
}));

describe('UploadModal', () => {
  beforeEach(() => {
    vi.mocked(getDocumentParser).mockReset();
  });

  it('labels its controls and exposes keyboard-operable parser and file choices', async () => {
    const user = userEvent.setup();
    render(
      <UploadModal
        isOpen
        onClose={vi.fn()}
        onDocumentParsed={vi.fn()}
      />
    );

    expect(screen.getByLabelText('Document type')).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: 'Document parser' })).toBeInTheDocument();
    const offline = screen.getByRole('radio', { name: /Offline/ });
    const openai = screen.getByRole('radio', { name: /GPT-4o/ });
    expect(offline).toHaveAttribute('aria-checked', 'true');
    await user.click(openai);
    expect(openai).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByLabelText('Choose a tax document')).toBeInTheDocument();
    expect(screen.getByLabelText('Document type')).toHaveValue('auto');
    expect(screen.getByLabelText('Choose a tax document')).toHaveAttribute(
      'accept',
      expect.stringContaining('image/png')
    );
    expect(
      screen.getByRole('button', { name: /Drop a file here, or choose a file/ })
    ).toBeInTheDocument();
  });

  it('requires a field-by-field review before importing OCR results', async () => {
    const user = userEvent.setup();
    const onDocumentParsed = vi.fn();
    vi.mocked(getDocumentParser).mockReturnValue({
      providerId: 'rule_based',
      providerName: 'Offline',
      parseDocument: vi.fn(async (): Promise<ParsedDocumentResult> => ({
        documentType: 'notice_of_assessment',
        financialYear: '2025–26',
        confidenceAverage: 0.69,
        extractionSource: 'ocr',
        pageCount: 2,
        rawText: '',
        extractedFields: {
          taxableIncome: {
            value: 89670,
            confidence: 0.68,
            sourcePage: 2,
            sourceText: 'Taxable income $89,670'
          },
          assessmentResult: {
            value: 1284,
            confidence: 0.93,
            sourcePage: 2,
            sourceText: 'Refund $1,284'
          }
        }
      }))
    });

    render(
      <UploadModal
        isOpen
        onClose={vi.fn()}
        onDocumentParsed={onDocumentParsed}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Try a sample document' }));
    const taxableIncome = await screen.findByLabelText('Taxable income');
    expect(screen.getByText('On-device OCR')).toBeInTheDocument();
    expect(screen.getByText(/Page 2 · 68%/)).toBeInTheDocument();

    await user.clear(taxableIncome);
    fireEvent.change(taxableIncome, { target: { value: '90000' } });
    await user.click(screen.getByLabelText('Include Assessment result'));
    await user.click(screen.getByRole('button', { name: 'Add 1 reviewed field' }));

    expect(onDocumentParsed).toHaveBeenCalledTimes(1);
    const result = onDocumentParsed.mock.calls[0][3];
    expect(result.extractedFields.taxableIncome.value).toBe(90000);
    expect(result.extractedFields.taxableIncome.userReviewed).toBe(true);
    expect(result.extractedFields.assessmentResult).toBeUndefined();
  });
});
