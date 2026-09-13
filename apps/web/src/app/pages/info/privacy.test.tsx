import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { Privacy } from './privacy';

describe('Privacy', () => {
  it('explains prayer audiences, deletion, and on-demand translation processing', () => {
    render(
      <MemoryRouter>
        <Privacy />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Privacy Policy' })).toBeTruthy();
    expect(screen.getByText(/Public prayers are visible/)).toHaveTextContent(
      /Prayer Circle prayers are limited to accepted Circle connections/
    );
    expect(screen.getByText(/When you explicitly tap Translate/)).toHaveTextContent(
      /Google Cloud Translation/
    );
    expect(screen.getByText(/Account deletion removes your profile/)).toHaveTextContent(
      /associated prayers, comments, connections, saved items/
    );
  });
});
