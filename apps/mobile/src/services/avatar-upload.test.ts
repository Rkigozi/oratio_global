import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabase';
import { chooseAndUploadAvatar } from './avatar-upload';

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));
jest.mock('./supabase', () => ({
  supabase: { auth: { getUser: jest.fn() }, storage: { from: jest.fn() } },
}));

beforeEach(() => {
  jest.resetAllMocks();
  jest
    .mocked(ImagePicker.requestMediaLibraryPermissionsAsync)
    .mockResolvedValue({ granted: true } as never);
  jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'file:///synthetic.jpg', base64: 'AQ==', fileSize: 1 }],
  } as never);
});

describe('avatar account boundary', () => {
  it('does not upload a selected photo to an account that changed while the picker was open', async () => {
    jest
      .mocked(supabase.auth.getUser)
      .mockResolvedValue({ data: { user: { id: 'new-account' } }, error: null } as never);
    expect(await chooseAndUploadAvatar('original-account')).toMatchObject({ status: 'error' });
    expect(supabase.storage.from).not.toHaveBeenCalled();
  });
  it('keeps user cancellation separate from a failed backend write', async () => {
    jest
      .mocked(ImagePicker.launchImageLibraryAsync)
      .mockResolvedValue({ canceled: true, assets: null } as never);
    expect(await chooseAndUploadAvatar('original-account')).toEqual({ status: 'cancelled' });
    expect(supabase.auth.getUser).not.toHaveBeenCalled();
    expect(supabase.storage.from).not.toHaveBeenCalled();
  });
});
