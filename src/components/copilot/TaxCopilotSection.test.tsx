import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createBlankFinancialYear } from '../../data/blankFinancialYear';
import { TaxCopilotSection } from './TaxCopilotSection';

describe('TaxCopilotSection PDF export', () => {
  it('downloads the preparation summary as a PDF', async () => {
    const user = userEvent.setup();
    const originalCreateObjectUrl = URL.createObjectURL;
    const originalRevokeObjectUrl = URL.revokeObjectURL;
    const receivedBlobs: Blob[] = [];
    const createObjectUrl = vi.fn((blob: Blob) => {
      receivedBlobs.push(blob);
      return 'blob:tax-prep-pdf';
    });
    const revokeObjectUrl = vi.fn();
    let downloadName = '';

    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectUrl
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectUrl
    });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        downloadName = this.download;
      });

    try {
      render(
        <TaxCopilotSection
          currentFy={createBlankFinancialYear(
            '2024-25',
            '2024–25',
            '2024-07-01',
            '2025-06-30'
          )}
          onChange={vi.fn()}
          onOpenUpload={vi.fn()}
        />
      );

      await user.click(screen.getByRole('button', { name: 'Download preparation PDF' }));

      expect(createObjectUrl).toHaveBeenCalledOnce();
      expect(receivedBlobs[0]).toBeInstanceOf(Blob);
      expect(receivedBlobs[0]?.type).toBe('application/pdf');
      expect(downloadName).toBe('ATO-Lens-myTax-Prep-2024-25.pdf');
      expect(click).toHaveBeenCalledOnce();
      expect(revokeObjectUrl).toHaveBeenCalledWith('blob:tax-prep-pdf');
    } finally {
      click.mockRestore();
      Object.defineProperty(URL, 'createObjectURL', {
        configurable: true,
        value: originalCreateObjectUrl
      });
      Object.defineProperty(URL, 'revokeObjectURL', {
        configurable: true,
        value: originalRevokeObjectUrl
      });
    }
  });
});
