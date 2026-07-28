import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { UploadModal } from './UploadModal';

vi.mock('../../parser/providerFactory', () => ({
  getDocumentParser: vi.fn(),
  isMissingApiKey: vi.fn(() => false)
}));

describe('UploadModal', () => {
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
    expect(
      screen.getByRole('button', { name: /Drop a file here, or choose a file/ })
    ).toBeInTheDocument();
  });
});
