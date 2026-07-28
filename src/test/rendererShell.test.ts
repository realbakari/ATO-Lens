import { describe, expect, it } from 'vitest';
import html from '../../index.html?raw';
import css from '../index.css?raw';

describe('renderer shell privacy', () => {
  it('does not load remote fonts or preconnect to font hosts', () => {
    const shell = `${html}\n${css}`;
    expect(shell).not.toMatch(/fonts\.googleapis|fonts\.gstatic|rsms\.me/i);
    expect(shell).not.toMatch(/rel=["']preconnect["']/i);
  });

  it('provides a reduced-motion fallback for animated UI surfaces', () => {
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toContain('.dialog-popup');
    expect(css).toContain('.drawer-slide-in');
  });
});
