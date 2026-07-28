import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Modal } from './Modal';

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open dialog
      </button>
      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Example dialog"
        subtitle="Example description"
      >
        <button type="button">Inside action</button>
      </Modal>
    </>
  );
}

describe('Modal', () => {
  it('associates its title, traps focus, closes on Escape, and restores focus', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Open dialog' });
    await user.click(opener);

    const dialog = screen.getByRole('dialog', { name: 'Example dialog' });
    expect(dialog).toHaveAccessibleDescription('Example description');
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Close dialog' })).toHaveFocus()
    );

    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Inside action' })).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });
});
