import { expect, it, jest } from '@jest/globals';
import * as ReactNative from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { PrayerEditSheet } from './prayer-owner-actions';

jest.mock('lucide-react-native', () => ({
  Ban: () => null,
  Copy: () => null,
  Flag: () => null,
  Pencil: () => null,
  Share2: () => null,
  Trash2: () => null,
  X: () => null,
}));

it('gives editor actions their own full-width space at maximum text size and keeps them operable', () => {
  const dimensions = jest.spyOn(ReactNative, 'useWindowDimensions').mockReturnValue({
    width: 390,
    height: 844,
    scale: 3,
    fontScale: 3.571,
  });
  try {
    const onSave = jest.fn();
    const onClose = jest.fn();
    const onChangeText = jest.fn();
    render(
      <PrayerEditSheet
        error=""
        onChangeText={onChangeText}
        onClose={onClose}
        onSave={onSave}
        saving={false}
        text="Synthetic QA draft"
        visible
      />
    );

    const cancel = screen.getByRole('button', { name: 'Cancel' });
    const save = screen.getByRole('button', { name: 'Save changes' });
    expect(cancel).toHaveStyle({ flex: 0 });
    expect(save).toHaveStyle({ flex: 0 });
    fireEvent.changeText(screen.getByLabelText('Prayer text'), 'Updated QA draft');
    expect(onChangeText).toHaveBeenCalledWith('Updated QA draft');
    fireEvent.press(save);
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.press(cancel);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledTimes(1);
  } finally {
    dimensions.mockRestore();
  }
});
