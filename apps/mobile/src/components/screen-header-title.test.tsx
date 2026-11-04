import { expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import { ScreenHeaderTitle } from './screen-header-title';

it('exposes the full contextual title as a heading for screen-reader navigation', () => {
  render(<ScreenHeaderTitle title="Prayer Circle" subtitle="Shared with your circle" />);

  expect(screen.getByRole('header', { name: 'Prayer Circle' })).toBeTruthy();
  expect(screen.getByText('Shared with your circle')).toBeTruthy();
});
