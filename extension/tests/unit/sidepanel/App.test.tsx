import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from '../../../src/sidepanel/App';

describe('App', () => {
  it('renders the MediaFetch Side Panel shell', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'MediaFetch' })).toBeTruthy();
  });
});
