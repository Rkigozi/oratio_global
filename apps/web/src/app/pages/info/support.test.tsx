import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { Support } from './support';

vi.mock('../../components/crisis-resources', () => ({
  CrisisResources: () => <div>Country-specific crisis resources</div>,
}));

describe('Support', () => {
  it('provides public account, legal, and safety guidance', () => {
    render(
      <MemoryRouter>
        <Support />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Oratio Support' })).toBeTruthy();
    expect(screen.getByText('Account access')).toBeTruthy();
    expect(screen.getByText('Account deletion')).toBeTruthy();
    expect(screen.getByText('Country-specific crisis resources')).toBeTruthy();
    expect(screen.getByRole('link', { name: /Reset password/ })).toHaveAttribute(
      'href',
      '/reset-password'
    );
    expect(screen.getByRole('link', { name: /Privacy policy/ })).toHaveAttribute(
      'href',
      '/privacy'
    );
    expect(screen.getByRole('link', { name: /Terms of service/ })).toHaveAttribute(
      'href',
      '/terms'
    );
  });
});
