import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createBlankFinancialYear } from '../../data/blankFinancialYear';
import { Navbar } from './Navbar';

const years = [
  createBlankFinancialYear('2025-26', '2025–26', '2025-07-01', '2026-06-30'),
  createBlankFinancialYear('2024-25', '2024–25', '2024-07-01', '2025-06-30')
];

describe('Navbar', () => {
  it('provides a compact financial-year selector below the desktop breakpoint', async () => {
    const user = userEvent.setup();
    const onSelectFy = vi.fn();
    render(
      <Navbar
        financialYears={years}
        selectedFyId="2025-26"
        onSelectFy={onSelectFy}
        onOpenUpload={vi.fn()}
        onToggleChat={vi.fn()}
        onOpenPrivacy={vi.fn()}
        isChatOpen={false}
      />
    );

    const selector = screen.getByLabelText('Financial year');
    await user.selectOptions(selector, '2024-25');
    expect(onSelectFy).toHaveBeenCalledWith('2024-25');
    expect(screen.getByRole('button', { name: '2025–26' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });
});
