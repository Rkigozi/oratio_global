import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const { qb, auth, from, rpc, responses } = vi.hoisted(() => {
  const qb: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const method of [
    'select',
    'eq',
    'is',
    'ilike',
    'limit',
    'or',
    'order',
    'range',
    'insert',
    'update',
    'delete',
    'single',
    'maybeSingle',
    'abortSignal',
  ])
    qb[method] = vi.fn().mockReturnThis();
  const responses: unknown[] = [];
  qb.then = vi.fn();
  return { qb, auth: { getUser: vi.fn() }, from: vi.fn(() => qb), rpc: vi.fn(() => qb), responses };
});
vi.mock('@oratio/shared/client', () => ({ getSupabaseClient: () => ({ auth, from, rpc }) }));
import {
  createComment,
  updateComment,
  deleteComment,
  getComments,
  getCommentCount,
  sendPrayerCircleInvite,
  cancelPrayerCircleInvite,
  respondToPrayerCircleInvite,
  removeFromPrayerCircle,
  getPrayerCircle,
  getPrayerCircleInvites,
  createReport,
  getProfilePreferences,
  updateProfilePreferences,
  togglePray,
  toggleSavePrayer,
  getMyPrayedIds,
  getMySavedIds,
  searchUsers,
  updatePrayerRequest,
  deletePrayerRequest,
  renewPublicPrayer,
  updateProfile,
  getMyProfile,
} from '@oratio/shared/queries';
import { type WriteAttempt } from '@oratio/shared/write-outcome';

const id = '72000000-0000-4000-8000-000000000001';
const attempt = (changes: Partial<WriteAttempt> = {}): WriteAttempt => ({
  requestId: id,
  expectedUserId: 'owner',
  verifyExisting: false,
  deadlineAt: Date.now() + 18_000,
  ...changes,
});
const respond = (data: unknown, error: unknown = null, extra = {}) => ({ data, error, ...extra });
const comment = {
  id,
  user_id: 'owner',
  prayer_id: 'prayer',
  body: 'Synthetic encouragement',
  parent_id: null,
  created_at: '2026-10-30T00:00:00Z',
  updated_at: '2026-10-30T00:00:00Z',
  profiles: null,
};
const input = { prayer_id: 'prayer', body: comment.body };
const invite = {
  id,
  requester_id: 'owner',
  recipient_id: 'peer',
  message: null,
  status: 'pending',
};
beforeEach(() => {
  vi.clearAllMocks();
  responses.length = 0;
  auth.getUser.mockResolvedValue({ data: { user: { id: 'owner' } }, error: null });
  qb.then.mockImplementation((resolve: (v: unknown) => void, reject: (e: unknown) => void) => {
    const next = responses.shift();
    if (next instanceof Error) reject(next);
    else if (next === undefined) reject(new Error('Unexpected database request'));
    else resolve(next);
  });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  expect(responses).toHaveLength(0);
  vi.restoreAllMocks();
});

describe('comment write confirmation', () => {
  it('inserts using the original attempt ID and authenticated owner', async () => {
    responses.push(respond(comment));
    expect((await createComment(input, attempt()))?.id).toBe(id);
    expect(qb.insert).toHaveBeenCalledWith({ id, user_id: 'owner', ...input, parent_id: null });
  });
  it('recovers a committed comment after lost confirmation without inserting again', async () => {
    responses.push(respond(null, { message: 'private server detail' }));
    await expect(createComment(input, attempt())).rejects.toMatchObject({ uncertain: true });
    responses.push(respond(comment));
    expect((await createComment(input, attempt({ verifyExisting: true })))?.id).toBe(id);
    expect(qb.insert).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain(
      'private server detail'
    );
  });
  it('retries an absent comment with the same primary key and reconciles a racing insert', async () => {
    responses.push(respond(null), respond(null, { code: '23505' }), respond(comment));
    expect((await createComment(input, attempt({ verifyExisting: true })))?.id).toBe(id);
    expect(qb.insert).toHaveBeenCalledTimes(1);
    expect(qb.insert).toHaveBeenCalledWith(expect.objectContaining({ id }));
  });
  it.each([
    { body: 'different' },
    { parent_id: 'different' },
    { user_id: 'outsider' },
    { prayer_id: 'different' },
  ])('cannot claim or overwrite a conflicting comment: %o', async (change) => {
    responses.push(respond({ ...comment, ...change }));
    await expect(createComment(input, attempt({ verifyExisting: true }))).rejects.toMatchObject({
      uncertain: true,
    });
    expect(qb.insert).not.toHaveBeenCalled();
    expect(qb.update).not.toHaveBeenCalled();
  });
  it('does not insert when verification cannot read the row', async () => {
    responses.push(respond(null, new Error('offline')));
    await expect(createComment(input, attempt({ verifyExisting: true }))).rejects.toMatchObject({
      uncertain: true,
    });
    expect(qb.insert).not.toHaveBeenCalled();
  });
  it.each([{ code: 'PGRST116' }, { code: '', status: 403 }])(
    'keeps ambiguous write representations uncertain: %o',
    async (error) => {
      responses.push(respond(null, error));
      await expect(createComment(input, attempt())).rejects.toMatchObject({ uncertain: true });
    }
  );
  it('distinguishes an explicit first rejection without discarding a previously uncertain attempt', async () => {
    responses.push(respond(null, { code: '42501' }));
    await expect(createComment(input, attempt())).rejects.toMatchObject({ uncertain: false });
    responses.push(respond(null), respond(null, { code: '42501' }));
    await expect(createComment(input, attempt({ verifyExisting: true }))).rejects.toMatchObject({
      uncertain: true,
    });
  });
  it('does not write for another account or after cancelled authentication', async () => {
    auth.getUser.mockResolvedValueOnce({ data: { user: { id: 'outsider' } } });
    await expect(createComment(input, attempt())).rejects.toMatchObject({ uncertain: false });
    const controller = new AbortController();
    auth.getUser.mockImplementationOnce(async () => {
      controller.abort();
      return { data: { user: { id: 'owner' } } };
    });
    await expect(
      createComment(input, attempt({ signal: controller.signal }))
    ).rejects.toMatchObject({ uncertain: false });
    expect(from).not.toHaveBeenCalled();
  });
  it('cannot start a late write after preflight exhausts the shared deadline', async () => {
    vi.useFakeTimers();
    const options = attempt();
    auth.getUser.mockImplementationOnce(async () => {
      vi.advanceTimersByTime(18_000);
      return { data: { user: { id: 'owner' } } };
    });
    await expect(createComment(input, options)).rejects.toMatchObject({ uncertain: false });
    expect(qb.insert).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
  it('confirms an already applied edit without updating again', async () => {
    responses.push(respond({ ...comment, body: 'Updated' }));
    expect(
      (
        await updateComment(id, 'Updated', {
          ...attempt({ verifyExisting: true }),
          expectedUpdatedAt: comment.updated_at,
        })
      )?.body
    ).toBe('Updated');
    expect(qb.update).not.toHaveBeenCalled();
  });
  it('guards edits against concurrent changes to the same comment', async () => {
    responses.push(respond({ ...comment, updated_at: '2026-10-30T01:00:00Z' }));
    await expect(
      updateComment(id, 'Updated', { ...attempt(), expectedUpdatedAt: comment.updated_at })
    ).rejects.toMatchObject({ uncertain: false });
    expect(qb.update).not.toHaveBeenCalled();
    responses.push(respond(comment), respond({ ...comment, body: 'Updated' }));
    await updateComment(id, 'Updated', { ...attempt(), expectedUpdatedAt: comment.updated_at });
    expect(qb.eq).toHaveBeenCalledWith('updated_at', comment.updated_at);
  });
  it('checks absence after uncertain deletion and does not claim an empty delete acknowledgement', async () => {
    responses.push(respond([]));
    await expect(deleteComment(id, attempt())).rejects.toMatchObject({ uncertain: true });
    responses.push(respond(null));
    expect(await deleteComment(id, attempt({ verifyExisting: true }))).toBe(true);
    expect(qb.delete).toHaveBeenCalledTimes(1);
  });
});

describe('Circle action confirmation', () => {
  it('uses a stable invite ID and recovers the original sent invite', async () => {
    responses.push(respond(null, new Error('lost acknowledgement')));
    await expect(sendPrayerCircleInvite('peer', undefined, attempt())).rejects.toMatchObject({
      uncertain: true,
    });
    responses.push(respond(invite));
    expect(await sendPrayerCircleInvite('peer', undefined, attempt({ verifyExisting: true }))).toBe(
      true
    );
    expect(qb.insert).toHaveBeenCalledTimes(1);
    expect(qb.insert).toHaveBeenCalledWith(invitePayload());
  });
  it('does not recreate a sent invite after its recipient already handled it', async () => {
    responses.push(respond({ ...invite, status: 'accepted' }));
    expect(await sendPrayerCircleInvite('peer', undefined, attempt({ verifyExisting: true }))).toBe(
      true
    );
    expect(qb.insert).not.toHaveBeenCalled();
  });
  it('retries an absent invite using the same ID, including a unique-key race', async () => {
    responses.push(respond(null), respond(null, { code: '23505' }), respond(invite));
    expect(await sendPrayerCircleInvite('peer', undefined, attempt({ verifyExisting: true }))).toBe(
      true
    );
    expect(qb.insert).toHaveBeenCalledWith(invitePayload());
  });
  it('keeps conflicting invite content unresolved without inserting again', async () => {
    responses.push(respond({ ...invite, recipient_id: 'different' }));
    await expect(
      sendPrayerCircleInvite('peer', undefined, attempt({ verifyExisting: true }))
    ).rejects.toMatchObject({ uncertain: true });
    expect(qb.insert).not.toHaveBeenCalled();
  });
  it.each(['accepted', 'declined'] as const)(
    'does not repeat an already applied %s response',
    async (response) => {
      responses.push(respond({ id, status: response }));
      expect(
        await respondToPrayerCircleInvite(id, response, attempt({ verifyExisting: true }))
      ).toBe(true);
      expect(qb.eq).toHaveBeenCalledWith('recipient_id', 'owner');
      expect(rpc).not.toHaveBeenCalled();
    }
  );
  it('recognizes a completed cancellation and avoids its non-idempotent RPC', async () => {
    responses.push(respond({ id, status: 'cancelled' }));
    expect(await cancelPrayerCircleInvite(id, attempt({ verifyExisting: true }))).toBe(true);
    expect(qb.eq).toHaveBeenCalledWith('requester_id', 'owner');
    expect(rpc).not.toHaveBeenCalled();
  });
  it('returns a changed result instead of claiming a different terminal response succeeded', async () => {
    responses.push(respond({ id, status: 'declined' }));
    expect(
      await respondToPrayerCircleInvite(id, 'accepted', attempt({ verifyExisting: true }))
    ).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });
  it('checks the current invite before issuing a pending response', async () => {
    responses.push(respond({ id, status: 'pending' }), respond(null));
    expect(await respondToPrayerCircleInvite(id, 'accepted', attempt())).toBe(true);
    expect(rpc).toHaveBeenCalledWith('respond_to_prayer_circle_invite', {
      p_invite_id: id,
      p_status: 'accepted',
    });
  });
  it('never repeats a response if verification fails', async () => {
    responses.push(respond(null, { code: 'offline' }));
    await expect(
      cancelPrayerCircleInvite(id, attempt({ verifyExisting: true }))
    ).rejects.toMatchObject({ uncertain: true });
    expect(rpc).not.toHaveBeenCalled();
  });
  it('targets only the originally displayed connection and verifies its absence', async () => {
    responses.push(respond(null));
    expect(
      await removeFromPrayerCircle('peer', {
        ...attempt({ verifyExisting: true }),
        connectionId: 'connection-original',
      })
    ).toBe(true);
    expect(qb.eq).toHaveBeenCalledWith('id', 'connection-original');
    expect(qb.delete).not.toHaveBeenCalled();
  });
  it('does not remove connections when their original identity is unavailable', async () => {
    await expect(removeFromPrayerCircle('peer', attempt())).rejects.toMatchObject({
      uncertain: false,
    });
    expect(qb.delete).not.toHaveBeenCalled();
  });
});

function invitePayload() {
  return { id, requester_id: 'owner', recipient_id: 'peer', message: null };
}

describe('explicit native read failures', () => {
  it.each(['comments', 'count', 'circle', 'invites', 'preferences', 'prayed', 'saved', 'search'])(
    'does not represent a failed %s read as an empty result',
    async (kind) => {
      responses.push(respond(null, { code: 'offline' }, { count: null }));
      const operation =
        kind === 'comments'
          ? getComments('prayer', 20, 0, { throwOnError: true })
          : kind === 'count'
            ? getCommentCount('prayer', { throwOnError: true })
            : kind === 'circle'
              ? getPrayerCircle({ throwOnError: true })
              : kind === 'invites'
                ? getPrayerCircleInvites({ throwOnError: true })
                : kind === 'preferences'
                  ? getProfilePreferences({ throwOnError: true })
                  : kind === 'prayed'
                    ? getMyPrayedIds({ throwOnError: true })
                    : kind === 'saved'
                      ? getMySavedIds({ throwOnError: true })
                      : searchUsers('synthetic', { throwOnError: true });
      await expect(operation).rejects.toThrow();
    }
  );
  it('rejects native Circle authentication failures before loading any list', async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error('offline') });
    await expect(getPrayerCircle({ throwOnError: true })).rejects.toThrow();
    await expect(getPrayerCircleInvites({ throwOnError: true })).rejects.toThrow();
    expect(from).not.toHaveBeenCalled();
  });
});

describe('report confirmation', () => {
  const reportInput = {
    reportable_type: 'comment' as const,
    reportable_id: 'comment',
    reason: 'Something else',
    details: 'Synthetic context',
  };
  const report = {
    id,
    reported_by: 'owner',
    ...reportInput,
    reporter_details: reportInput.details,
  };
  it('retains a report ID after a lost confirmation, including a report already resolved', async () => {
    responses.push(respond(null), respond(null, new Error('lost confirmation')));
    await expect(createReport(reportInput, attempt())).rejects.toMatchObject({ uncertain: true });
    responses.push(respond({ ...report, status: 'resolved' }));
    expect(await createReport(reportInput, attempt({ verifyExisting: true }))).toBe(
      'already_reported'
    );
    expect(qb.insert).toHaveBeenCalledTimes(1);
    expect(qb.insert).toHaveBeenCalledWith({
      id,
      reported_by: 'owner',
      reportable_type: 'comment',
      reportable_id: 'comment',
      reason: reportInput.reason,
      reporter_details: reportInput.details,
    });
  });
  it('reuses the ID when verification finds no row and reconciles a racing insert', async () => {
    responses.push(respond(null), respond(null), respond(null, { code: '23505' }), respond(report));
    expect(await createReport(reportInput, attempt({ verifyExisting: true }))).toBe(
      'already_reported'
    );
    expect(qb.insert).toHaveBeenCalledWith(expect.objectContaining({ id }));
  });
  it.each([
    { reported_by: 'outsider' },
    { reportable_id: 'different' },
    { reason: 'different' },
    { reporter_details: 'different' },
  ])('cannot claim conflicting report content %o', async (change) => {
    responses.push(respond({ ...report, ...change }));
    await expect(
      createReport(reportInput, attempt({ verifyExisting: true }))
    ).rejects.toMatchObject({ uncertain: true });
    expect(qb.insert).not.toHaveBeenCalled();
  });
  it('does not send another report when pending-report verification fails', async () => {
    responses.push(respond(null, { code: 'offline' }));
    await expect(createReport(reportInput, attempt())).rejects.toMatchObject({ uncertain: false });
    expect(qb.insert).not.toHaveBeenCalled();
  });
  it('confirms an existing pending report without writing or silently dropping details', async () => {
    responses.push(respond({ id: 'earlier-report' }));
    expect(await createReport(reportInput, attempt())).toBe('already_reported');
    expect(qb.insert).not.toHaveBeenCalled();
    responses.push(respond(null), respond(null, { code: 'PGRST204' }));
    expect(await createReport(reportInput, attempt())).toBe('setup_required');
    expect(qb.insert).toHaveBeenCalledTimes(1);
  });
});

describe('desired-state prayer interactions', () => {
  it.each([togglePray, toggleSavePrayer])(
    'confirms an already applied action without toggling it back',
    async (toggle) => {
      responses.push(respond({ prayer_id: 'prayer' }));
      expect(await toggle('prayer', true, attempt({ verifyExisting: true }))).toBe(true);
      expect(qb.insert).not.toHaveBeenCalled();
      expect(qb.delete).not.toHaveBeenCalled();
    }
  );
  it.each([togglePray, toggleSavePrayer])(
    'verifies removal without recreating the membership',
    async (toggle) => {
      responses.push(respond(null));
      expect(await toggle('prayer', false, attempt({ verifyExisting: true }))).toBe(true);
      expect(qb.insert).not.toHaveBeenCalled();
      expect(qb.delete).not.toHaveBeenCalled();
    }
  );
  it('reconciles a concurrent response insert through the existing unique constraint', async () => {
    responses.push(
      respond(null),
      respond(null, { code: '23505' }),
      respond({ prayer_id: 'prayer' })
    );
    expect(await togglePray('prayer', true, attempt())).toBe(true);
    expect(qb.insert).toHaveBeenCalledWith({ user_id: 'owner', prayer_id: 'prayer' });
  });
  it('never mutates the desired state after a failed read', async () => {
    responses.push(respond(null, { code: 'offline' }));
    await expect(
      toggleSavePrayer('prayer', false, attempt({ verifyExisting: true }))
    ).rejects.toMatchObject({ uncertain: true });
    expect(qb.delete).not.toHaveBeenCalled();
  });
  it('keeps an unacknowledged response unresolved', async () => {
    responses.push(respond(null), respond(null, { status: 403 }));
    await expect(togglePray('prayer', true, attempt())).rejects.toMatchObject({ uncertain: true });
  });
});

describe('profile preference recovery', () => {
  const preferences = { theme: 'dark', language: 'es', future_setting: 'retained' };
  it('never replaces existing preferences with defaults when preflight fails', async () => {
    responses.push(respond(null, new Error('offline')));
    await expect(updateProfilePreferences({ theme: 'light' }, attempt())).rejects.toMatchObject({
      uncertain: false,
    });
    expect(qb.update).not.toHaveBeenCalled();
  });
  it('preserves unrelated fields and guards the exact preflight JSON against concurrent changes', async () => {
    responses.push(
      respond({ id: 'owner', preferences }),
      respond({ id: 'owner', preferences: { ...preferences, theme: 'light' } })
    );
    expect(await updateProfilePreferences({ theme: 'light' }, attempt())).toBe(true);
    expect(qb.eq).toHaveBeenCalledWith('preferences', JSON.stringify(preferences));
    expect(qb.update).toHaveBeenCalledWith({
      preferences: expect.objectContaining({ ...preferences, theme: 'light' }),
    });
  });
  it('confirms an already saved setting without overwriting another device’s preferences', async () => {
    responses.push(respond({ id: 'owner', preferences }));
    expect(
      await updateProfilePreferences({ theme: 'dark' }, attempt({ verifyExisting: true }))
    ).toBe(true);
    expect(qb.update).not.toHaveBeenCalled();
  });
  it('handles an initial null preferences object with a null comparison guard', async () => {
    responses.push(
      respond({ id: 'owner', preferences: null }),
      respond({ id: 'owner', preferences: { theme: 'light' } })
    );
    expect(await updateProfilePreferences({ theme: 'light' }, attempt())).toBe(true);
    expect(qb.is).toHaveBeenCalledWith('preferences', null);
  });
  it('does not claim a concurrent zero-row update succeeded', async () => {
    responses.push(respond({ id: 'owner', preferences }), respond(null, { code: 'PGRST116' }));
    await expect(updateProfilePreferences({ theme: 'light' }, attempt())).rejects.toMatchObject({
      uncertain: true,
    });
  });
});

describe('profile field confirmation', () => {
  const profile = {
    id: 'owner',
    username: 'synthetic_owner',
    bio: 'Original bio',
    avatar_url: null,
  };
  const profileAttempt = () => ({ ...attempt(), expectedValues: { bio: profile.bio } });
  it('uses the original displayed field as a comparison guard', async () => {
    responses.push(respond(profile), respond({ ...profile, bio: 'Updated bio' }));
    expect(await updateProfile({ bio: 'Updated bio' }, profileAttempt())).toBe(true);
    expect(qb.eq).toHaveBeenCalledWith('bio', profile.bio);
  });
  it('confirms an already saved profile field without another update', async () => {
    responses.push(respond({ ...profile, bio: 'Updated bio' }));
    expect(
      await updateProfile({ bio: 'Updated bio' }, { ...profileAttempt(), verifyExisting: true })
    ).toBe(true);
    expect(qb.update).not.toHaveBeenCalled();
  });
  it('does not overwrite another device’s edit or save a photo for another identity', async () => {
    responses.push(respond({ ...profile, bio: 'Concurrent bio' }));
    await expect(updateProfile({ bio: 'Updated bio' }, profileAttempt())).rejects.toMatchObject({
      uncertain: false,
    });
    auth.getUser.mockResolvedValueOnce({ data: { user: { id: 'outsider' } } });
    await expect(
      updateProfile(
        { avatar_url: 'https://example.com/avatar.jpg' },
        { ...attempt(), expectedValues: { avatar_url: null } }
      )
    ).rejects.toMatchObject({ uncertain: false });
    expect(qb.update).not.toHaveBeenCalled();
  });
  it('requires strict reads before native profile edits', async () => {
    responses.push(respond(null, { code: 'offline' }));
    await expect(getMyProfile({ throwOnError: true })).rejects.toThrow('Profile unavailable');
  });
});

describe('prayer ownership recovery', () => {
  const original = { id: 'prayer', body: 'Original synthetic request', edited_at: null };
  const editAttempt = () => ({ ...attempt(), expectedText: original.body, expectedEditedAt: null });
  it('guards an edit with its original text and timestamp', async () => {
    responses.push(
      respond(original),
      respond({ ...original, body: 'Updated synthetic request', edited_at: '2026-10-30T01:00:00Z' })
    );
    expect(await updatePrayerRequest('prayer', 'Updated synthetic request', editAttempt())).toEqual(
      { text: 'Updated synthetic request', editedAt: '2026-10-30T01:00:00Z' }
    );
    expect(qb.eq).toHaveBeenCalledWith('body', original.body);
    expect(qb.is).toHaveBeenCalledWith('edited_at', null);
  });
  it('confirms a committed edit without editing it again or moving its edit timestamp', async () => {
    responses.push(
      respond({ ...original, body: 'Updated synthetic request', edited_at: '2026-10-30T01:00:00Z' })
    );
    expect(
      await updatePrayerRequest('prayer', 'Updated synthetic request', {
        ...editAttempt(),
        verifyExisting: true,
      })
    ).toMatchObject({ text: 'Updated synthetic request' });
    expect(qb.update).not.toHaveBeenCalled();
  });
  it('does not overwrite a prayer edited elsewhere', async () => {
    responses.push(respond({ ...original, body: 'A different update' }));
    await expect(
      updatePrayerRequest('prayer', 'Updated synthetic request', editAttempt())
    ).rejects.toMatchObject({ uncertain: false });
    expect(qb.update).not.toHaveBeenCalled();
  });
  it('requires an ID acknowledgement for deletion and distinguishes later unavailability from erasure', async () => {
    responses.push(respond(null));
    await expect(deletePrayerRequest('prayer', attempt())).rejects.toMatchObject({
      uncertain: true,
    });
    responses.push(respond(null));
    expect(await deletePrayerRequest('prayer', attempt({ verifyExisting: true }))).toBe(false);
    expect(qb.delete).toHaveBeenCalledTimes(1);
  });
  it('does not repeat deletion if verification fails', async () => {
    responses.push(respond(null, new Error('offline')));
    await expect(
      deletePrayerRequest('prayer', attempt({ verifyExisting: true }))
    ).rejects.toMatchObject({ uncertain: true });
    expect(qb.delete).not.toHaveBeenCalled();
  });
  it('confirms an already renewed prayer without restarting its clock', async () => {
    const activeExpiry = new Date(Date.now() + 12 * 86400_000).toISOString();
    responses.push(respond({ id: 'prayer', audience: 'public', public_expires_at: activeExpiry }));
    expect(
      await renewPublicPrayer('prayer', {
        ...attempt({ verifyExisting: true }),
        expectedExpiresAt: '2020-01-01T00:00:00Z',
      })
    ).toBe(activeExpiry);
    expect(rpc).not.toHaveBeenCalled();
  });
  it('only renews the original archive and never replays a later expired renewal', async () => {
    const originalExpiry = '2020-01-01T00:00:00Z';
    const activeExpiry = new Date(Date.now() + 14 * 86400_000).toISOString();
    responses.push(
      respond({ id: 'prayer', audience: 'public', public_expires_at: originalExpiry }),
      respond(activeExpiry)
    );
    expect(
      await renewPublicPrayer('prayer', { ...attempt(), expectedExpiresAt: originalExpiry })
    ).toBe(activeExpiry);
    responses.push(
      respond({ id: 'prayer', audience: 'public', public_expires_at: '2020-02-01T00:00:00Z' })
    );
    await expect(
      renewPublicPrayer('prayer', {
        ...attempt({ verifyExisting: true }),
        expectedExpiresAt: originalExpiry,
      })
    ).rejects.toMatchObject({ uncertain: true });
    expect(rpc).toHaveBeenCalledTimes(1);
  });
});
