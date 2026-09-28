import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockGetUser =
  jest.fn<() => Promise<{ data: { user: { id: string } | null }; error: unknown }>>();
const mockRpc =
  jest.fn<(name: string, args: unknown) => Promise<{ data?: unknown; error: unknown }>>();
jest.mock('@oratio/shared/client', () => ({
  getSupabaseClient: () => ({
    auth: { getUser: () => mockGetUser() },
    rpc: (name: string, args: unknown) => mockRpc(name, args),
  }),
}));
import { blockUser, getBlockedAccounts, unblockUser } from '@oratio/shared/queries';

describe('blocking queries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: 'viewer' } }, error: null });
    mockRpc.mockResolvedValue({ data: [], error: null });
  });

  it('uses caller-authenticated RPCs without accepting an arbitrary blocker ID', async () => {
    await blockUser('other');
    expect(mockRpc).toHaveBeenLastCalledWith('block_user', { p_user_id: 'other' });
    await unblockUser('other');
    expect(mockRpc).toHaveBeenLastCalledWith('unblock_user', { p_user_id: 'other' });
  });

  it('rejects self-blocks and missing sessions before writing', async () => {
    await expect(blockUser('viewer')).rejects.toThrow('Choose another');
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(blockUser('other')).rejects.toThrow('Sign in again');
    await expect(unblockUser('other')).rejects.toThrow('Sign in again');
    await expect(getBlockedAccounts()).rejects.toThrow('Sign in again');
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('does not turn write or list failures into false success or an empty list', async () => {
    mockRpc.mockResolvedValue({ error: { message: 'backend details' } });
    await expect(blockUser('other')).rejects.toThrow("couldn't block");
    await expect(unblockUser('other')).rejects.toThrow("couldn't unblock");
    await expect(getBlockedAccounts()).rejects.toThrow("couldn't load");
  });

  it('requests bounded pages and normalizes a negative offset', async () => {
    await expect(getBlockedAccounts(-3)).resolves.toEqual([]);
    expect(mockRpc).toHaveBeenLastCalledWith('get_blocked_accounts', { p_limit: 50, p_offset: 0 });
    await getBlockedAccounts(50);
    expect(mockRpc).toHaveBeenLastCalledWith('get_blocked_accounts', { p_limit: 50, p_offset: 50 });
  });
});
