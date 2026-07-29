import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';

vi.mock('./supabase', () => {
  const makeQb = () => {
    const qb: Record<string, ReturnType<typeof vi.fn>> = {};
    qb.select = vi.fn().mockReturnThis();
    qb.eq = vi.fn().mockReturnThis();
    qb.neq = vi.fn().mockReturnThis();
    qb.order = vi.fn().mockReturnThis();
    qb.limit = vi.fn().mockReturnThis();
    qb.single = vi.fn().mockReturnThis();
    qb.insert = vi.fn().mockReturnThis();
    qb.delete = vi.fn().mockReturnThis();
    qb.in = vi.fn().mockReturnThis();
    qb.not = vi.fn().mockReturnThis();
    qb.ilike = vi.fn().mockReturnThis();
    qb.or = vi.fn().mockReturnThis();
    qb.maybeSingle = vi.fn().mockReturnThis();
    qb.range = vi.fn().mockReturnThis();
    qb.update = vi.fn().mockReturnThis();
    qb.then = vi.fn((resolve: (v: unknown) => void) => resolve({ data: null, error: null }));
    return qb;
  };
  const qb = makeQb();
  return {
    supabase: {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user' } }, error: null }),
        getSession: vi
          .fn()
          .mockResolvedValue({ data: { session: { access_token: 't' } }, error: null }),
      },
      from: () => qb,
      rpc: vi.fn(),
      functions: { invoke: vi.fn() },
    },
  };
});

let m: typeof import('./supabase-queries');
let qb: Record<string, ReturnType<typeof vi.fn>>;
let auth: { getUser: ReturnType<typeof vi.fn>; getSession: ReturnType<typeof vi.fn> };
let rpc: ReturnType<typeof vi.fn>;
let functionsInvoke: ReturnType<typeof vi.fn>;
let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

function setOnce(data: unknown, error: unknown = null, count?: number) {
  qb.then.mockImplementationOnce((resolve: (v: unknown) => void) =>
    resolve({ data, error, count } as never)
  );
}

function setAlways(data: unknown, error: unknown = null, count?: number) {
  qb.then.mockImplementation((resolve: (v: unknown) => void) =>
    resolve({ data, error, count } as never)
  );
}

beforeAll(async () => {
  const { supabase } = await import('./supabase');
  qb = supabase.from() as unknown as Record<string, ReturnType<typeof vi.fn>>;
  auth = supabase.auth as unknown as {
    getUser: ReturnType<typeof vi.fn>;
    getSession: ReturnType<typeof vi.fn>;
  };
  rpc = supabase.rpc as ReturnType<typeof vi.fn>;
  functionsInvoke = supabase.functions.invoke as ReturnType<typeof vi.fn>;
  m = await import('./supabase-queries');
});

beforeEach(() => {
  vi.clearAllMocks();
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  auth.getUser.mockResolvedValue({ data: { user: { id: 'test-user' } }, error: null });
  auth.getSession.mockResolvedValue({ data: { session: { access_token: 't' } }, error: null });

  qb.select.mockReturnThis();
  qb.eq.mockReturnThis();
  qb.neq.mockReturnThis();
  qb.order.mockReturnThis();
  qb.limit.mockReturnThis();
  qb.single.mockReturnThis();
  qb.insert.mockReturnThis();
  qb.delete.mockReturnThis();
  qb.in.mockReturnThis();
  qb.not.mockReturnThis();
  qb.ilike.mockReturnThis();
  qb.or.mockReturnThis();
  qb.maybeSingle.mockReturnThis();
  qb.range.mockReturnThis();
  qb.update.mockReturnThis();
  qb.then.mockImplementation((resolve: (v: unknown) => void) =>
    resolve({ data: null, error: null })
  );

  rpc.mockResolvedValue({ error: null });
  functionsInvoke.mockResolvedValue({ error: null });
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe('getMapHotspots', () => {
  it('uses aggregated map totals when the RPC is available', async () => {
    rpc.mockResolvedValueOnce({
      data: [
        {
          location_city: 'London',
          location_country: 'United Kingdom',
          location_lat: 51.5,
          location_lng: -0.1,
          request_count: 3,
          prayer_count: 12,
          latest_created_at: '2024-01-03',
        },
        {
          location_city: 'Unknown',
          location_country: 'Unknown',
          location_lat: 0,
          location_lng: 0,
          request_count: 1,
          prayer_count: 1,
          latest_created_at: '2024-01-04',
        },
      ],
      error: null,
    });

    const result = await m.getMapHotspots();

    expect(result).toEqual([
      expect.objectContaining({
        id: 'location:london|united kingdom',
        city: 'London',
        country: 'United Kingdom',
        requestCount: 3,
        prayerCount: 12,
        createdAt: '2024-01-03',
      }),
    ]);
    expect(qb.select).not.toHaveBeenCalled();
  });

  it('returns mapped mappable prayers on fallback success', async () => {
    setAlways([
      {
        id: 'p1',
        body: 'Prayer 1',
        category: 'Health',
        location_city: 'London',
        location_country: 'UK',
        location_lat: 51.5,
        location_lng: -0.1,
        is_anonymous: false,
        prayer_count: 5,
        created_at: '2024-01-01',
        comments_enabled: true,
        profiles: { username: 'user1', display_name: 'User One' },
      },
      {
        id: 'unknown-location',
        body: 'Prayer without a mappable location',
        category: 'Family',
        location_city: 'Unknown',
        location_country: 'Unknown',
        location_lat: 0,
        location_lng: 0,
        is_anonymous: true,
        prayer_count: 1,
        created_at: '2024-01-02',
        comments_enabled: false,
        profiles: { username: 'user2', display_name: 'User Two' },
      },
    ]);
    const result = await m.getMapHotspots();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('p1');
    expect(result[0].username).toBe('user1');
    expect(result[0].name).toBe('User One');
    expect(result[0].commentsEnabled).toBe(true);
  });

  it('normalizes London location variants from existing rows', async () => {
    setAlways([
      {
        id: 'p-london',
        body: 'Prayer',
        category: null,
        location_city: 'Greater London',
        location_country: 'England',
        location_lat: 51.5,
        location_lng: -0.1,
        is_anonymous: false,
        prayer_count: 1,
        created_at: '2024-01-01',
        comments_enabled: true,
        profiles: { username: 'user1', display_name: 'User One' },
      },
    ]);

    const result = await m.getMapHotspots();

    expect(result[0].city).toBe('London');
    expect(result[0].country).toBe('United Kingdom');
  });

  it('returns empty array on error', async () => {
    setAlways(null, new Error('DB error'));
    expect(await m.getMapHotspots()).toEqual([]);
  });

  it('returns empty array when data is null', async () => {
    setAlways(null);
    expect(await m.getMapHotspots()).toEqual([]);
  });
});

describe('getFeedPrayers', () => {
  it('returns mapped prayers on success', async () => {
    setAlways([
      {
        id: 'f1',
        body: 'Feed 1',
        category: 'Other',
        location_city: 'NYC',
        location_country: 'US',
        location_lat: 40.7,
        location_lng: -74.0,
        is_anonymous: false,
        prayer_count: 3,
        created_at: '2024-01-01',
        comments_enabled: true,
        profiles: { username: 'u1', display_name: 'U1' },
      },
    ]);
    const result = await m.getFeedPrayers();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('f1');
    expect(result[0].audience).toBe('public');
    expect(qb.eq).toHaveBeenCalledWith('audience', 'public');
  });

  it('loads only Circle prayers in Circle mode', async () => {
    setAlways([]);
    await m.getFeedPrayers(undefined, 20, 'circle');

    expect(qb.eq).toHaveBeenCalledWith('audience', 'circle');
    expect(qb.or).not.toHaveBeenCalled();
  });

  it('returns empty array on error', async () => {
    setAlways(null, new Error('fail'));
    expect(await m.getFeedPrayers()).toEqual([]);
  });
});

describe('getPrayerById', () => {
  it('returns prayer when found', async () => {
    setAlways({
      id: 'p1',
      body: 'Detail',
      category: 'Health',
      location_city: 'Rome',
      location_country: 'Italy',
      location_lat: 41.9,
      location_lng: 12.5,
      user_id: 'author-1',
      is_anonymous: false,
      prayer_count: 10,
      created_at: '2024-01-01',
      edited_at: '2024-01-02',
      comments_enabled: true,
      profiles: { username: 'ruser', display_name: 'R User' },
    });
    const result = await m.getPrayerById('p1');
    expect(result).not.toBeNull();
    expect(result!.id).toBe('p1');
    expect(result!.authorId).toBe('author-1');
    expect(result!.editedAt).toBe('2024-01-02');
  });

  it('returns null when not found', async () => {
    setAlways(null, new Error('not found'));
    expect(await m.getPrayerById('missing')).toBeNull();
  });

  it('returns null when data is null without error', async () => {
    setAlways(null);
    expect(await m.getPrayerById('missing')).toBeNull();
  });
});

describe('createPrayerRequest', () => {
  const prayer = {
    text: 'Test prayer',
    city: 'London',
    country: 'UK',
    lat: 51.5,
    lng: -0.1,
    category: 'Health',
    username: 'user1',
    prayerCount: 0,
    commentsEnabled: true,
  };

  it('creates and returns ID on success', async () => {
    setAlways({ id: 'new-id' });
    const result = await m.createPrayerRequest(prayer);
    expect(result).toBe('new-id');
    expect(qb.insert).toHaveBeenCalledWith(expect.objectContaining({ audience: 'public' }));
  });

  it('stores Circle audience when requested', async () => {
    setAlways({ id: 'new-id' });
    const result = await m.createPrayerRequest({ ...prayer, audience: 'circle' });

    expect(result).toBe('new-id');
    expect(qb.insert).toHaveBeenCalledWith(expect.objectContaining({ audience: 'circle' }));
  });

  it('stores canonical London location names', async () => {
    setAlways({ id: 'new-id' });
    const result = await m.createPrayerRequest({
      ...prayer,
      city: 'Greater London',
      country: 'England',
    });

    expect(result).toBe('new-id');
    expect(qb.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        location_city: 'London',
        location_country: 'United Kingdom',
      })
    );
  });

  it('returns null if no user', async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await m.createPrayerRequest(prayer)).toBeNull();
  });

  it('returns null on insert error', async () => {
    setAlways(null, new Error('insert failed'));
    expect(await m.createPrayerRequest(prayer)).toBeNull();
  });
});

describe('updatePrayerRequest', () => {
  it("updates body for the current user's own prayer", async () => {
    setAlways({ body: 'Updated prayer body', edited_at: '2024-01-03' });
    const result = await m.updatePrayerRequest('p1', 'Updated prayer body');

    expect(result).toEqual({ text: 'Updated prayer body', editedAt: '2024-01-03' });
    expect(qb.update).toHaveBeenCalledWith({ body: 'Updated prayer body' });
    expect(qb.eq).toHaveBeenCalledWith('id', 'p1');
    expect(qb.eq).toHaveBeenCalledWith('user_id', 'test-user');
  });

  it('returns null if no user', async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await m.updatePrayerRequest('p1', 'Updated prayer body')).toBeNull();
  });

  it('returns null on update error', async () => {
    setAlways(null, new Error('update failed'));
    expect(await m.updatePrayerRequest('p1', 'Updated prayer body')).toBeNull();
  });
});

describe('deletePrayerRequest', () => {
  it('returns true on success', async () => {
    setAlways(null);
    expect(await m.deletePrayerRequest('p1')).toBe(true);
  });

  it('returns false on error', async () => {
    setAlways(null, new Error('delete failed'));
    expect(await m.deletePrayerRequest('p1')).toBe(false);
  });
});

describe('togglePray', () => {
  it('inserts interaction and increments count when praying', async () => {
    setAlways(null);
    const result = await m.togglePray('p1', true);
    expect(result).toBe(true);
    expect(rpc).toHaveBeenCalledWith('increment_prayer_count', { p_prayer_id: 'p1' });
  });

  it('deletes interaction and decrements count when unpraying', async () => {
    setAlways(null);
    const result = await m.togglePray('p1', false);
    expect(result).toBe(true);
    expect(rpc).toHaveBeenCalledWith('decrement_prayer_count', { p_prayer_id: 'p1' });
  });

  it('returns false if no user', async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await m.togglePray('p1', true)).toBe(false);
  });
});

describe('getComments', () => {
  it('returns comments on success', async () => {
    setAlways([
      {
        id: 'c1',
        prayer_id: 'p1',
        user_id: 'u1',
        parent_id: null,
        body: 'Great prayer',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
        profiles: {
          username: 'commenter',
          display_name: 'Commenter',
          avatar_url: 'https://cdn.example.com/commenter.jpg',
        },
      },
      {
        id: 'c2',
        prayer_id: 'p1',
        user_id: 'u2',
        parent_id: 'c1',
        body: 'Reply',
        created_at: '2024-01-02',
        updated_at: '2024-01-02',
        profiles: null,
      },
    ]);
    const result = await m.getComments('p1');
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('c1');
    expect(result[0].user?.username).toBe('commenter');
    expect(result[0].user?.avatar_url).toBe('https://cdn.example.com/commenter.jpg');
    expect(result[1].parent_id).toBe('c1');
    expect(result[1].user).toBeNull();
  });

  it('returns empty on error', async () => {
    setAlways(null, new Error('fail'));
    expect(await m.getComments('p1')).toEqual([]);
  });
});

describe('createComment', () => {
  it('creates comment on success', async () => {
    setAlways({
      id: 'c-new',
      prayer_id: 'p1',
      user_id: 'test-user',
      parent_id: null,
      body: 'Nice!',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
      profiles: {
        username: 'testuser',
        display_name: 'Test User',
        avatar_url: 'https://cdn.example.com/testuser.jpg',
      },
    });
    const result = await m.createComment({ prayer_id: 'p1', body: 'Nice!' });
    expect(result).not.toBeNull();
    expect(result!.id).toBe('c-new');
    expect(result!.user?.avatar_url).toBe('https://cdn.example.com/testuser.jpg');
  });

  it('returns null if no user', async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await m.createComment({ prayer_id: 'p1', body: 'Nice!' })).toBeNull();
  });

  it('handles parent_id', async () => {
    setAlways({
      id: 'c-reply',
      prayer_id: 'p1',
      user_id: 'test-user',
      parent_id: 'c1',
      body: 'Reply',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
      profiles: null,
    });
    const result = await m.createComment({ prayer_id: 'p1', body: 'Reply', parent_id: 'c1' });
    expect(result).not.toBeNull();
    expect(result!.parent_id).toBe('c1');
  });
});

describe('updateComment', () => {
  it('updates own comment body on success', async () => {
    setAlways({
      id: 'c1',
      prayer_id: 'p1',
      user_id: 'test-user',
      parent_id: null,
      body: 'Updated encouragement',
      created_at: '2024-01-01',
      updated_at: '2024-01-02',
      profiles: {
        username: 'testuser',
        display_name: 'Test User',
        avatar_url: null,
      },
    });

    const result = await m.updateComment('c1', 'Updated encouragement');

    expect(result?.body).toBe('Updated encouragement');
    expect(result?.updated_at).toBe('2024-01-02');
    expect(qb.update).toHaveBeenCalledWith({ body: 'Updated encouragement' });
    expect(qb.eq).toHaveBeenCalledWith('id', 'c1');
    expect(qb.eq).toHaveBeenCalledWith('user_id', 'test-user');
  });

  it('returns null if no user', async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await m.updateComment('c1', 'Updated')).toBeNull();
    expect(qb.update).not.toHaveBeenCalled();
  });
});

describe('deleteComment', () => {
  it('returns true on success', async () => {
    setAlways(null);
    expect(await m.deleteComment('c1')).toBe(true);
    expect(qb.delete).toHaveBeenCalled();
    expect(qb.eq).toHaveBeenCalledWith('id', 'c1');
    expect(qb.eq).not.toHaveBeenCalledWith('user_id', 'test-user');
  });

  it('returns false on error', async () => {
    setAlways(null, new Error('fail'));
    expect(await m.deleteComment('c1')).toBe(false);
  });

  it('returns false when signed out', async () => {
    auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    expect(await m.deleteComment('c1')).toBe(false);
    expect(qb.delete).not.toHaveBeenCalled();
  });
});

describe('sendPrayerCircleInvite', () => {
  it('inserts an invite on success', async () => {
    setAlways(null);
    expect(await m.sendPrayerCircleInvite('target', 'Please keep praying with me')).toBe(true);
    expect(qb.insert).toHaveBeenCalledWith({
      requester_id: 'test-user',
      recipient_id: 'target',
      message: 'Please keep praying with me',
    });
  });

  it('returns false if no user', async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await m.sendPrayerCircleInvite('target')).toBe(false);
  });

  it('returns false for self-invites', async () => {
    expect(await m.sendPrayerCircleInvite('test-user')).toBe(false);
  });
});

describe('cancelPrayerCircleInvite', () => {
  it('calls the cancel invite RPC', async () => {
    expect(await m.cancelPrayerCircleInvite('invite-1')).toBe(true);
    expect(rpc).toHaveBeenCalledWith('cancel_prayer_circle_invite', {
      p_invite_id: 'invite-1',
    });
  });

  it('returns false if no user', async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await m.cancelPrayerCircleInvite('invite-1')).toBe(false);
  });
});

describe('respondToPrayerCircleInvite', () => {
  it('calls the response RPC', async () => {
    expect(await m.respondToPrayerCircleInvite('invite-1', 'accepted')).toBe(true);
    expect(rpc).toHaveBeenCalledWith('respond_to_prayer_circle_invite', {
      p_invite_id: 'invite-1',
      p_status: 'accepted',
    });
  });

  it('returns false if no user', async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await m.respondToPrayerCircleInvite('invite-1', 'declined')).toBe(false);
  });
});

describe('removeFromPrayerCircle', () => {
  it('deletes a mutual connection on success', async () => {
    setAlways(null);
    expect(await m.removeFromPrayerCircle('target')).toBe(true);
    expect(qb.or).toHaveBeenCalledWith(
      'and(user_a_id.eq.test-user,user_b_id.eq.target),and(user_a_id.eq.target,user_b_id.eq.test-user)'
    );
  });

  it('returns false if no user', async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await m.removeFromPrayerCircle('target')).toBe(false);
  });
});

describe('getPrayerCircleStatus', () => {
  it('returns connected when a connection exists', async () => {
    setOnce({ id: 'connection-1' });
    expect(await m.getPrayerCircleStatus('target')).toEqual({ state: 'connected' });
  });

  it('returns pending_sent when the current user sent the invite', async () => {
    setOnce(null);
    setOnce({ id: 'invite-1', requester_id: 'test-user', recipient_id: 'target' });
    expect(await m.getPrayerCircleStatus('target')).toEqual({
      state: 'pending_sent',
      inviteId: 'invite-1',
    });
  });

  it('returns pending_received when the other user sent the invite', async () => {
    setOnce(null);
    setOnce({ id: 'invite-2', requester_id: 'target', recipient_id: 'test-user' });
    expect(await m.getPrayerCircleStatus('target')).toEqual({
      state: 'pending_received',
      inviteId: 'invite-2',
    });
  });

  it('returns none when no relationship exists', async () => {
    setOnce(null);
    setOnce(null);
    expect(await m.getPrayerCircleStatus('target')).toEqual({ state: 'none' });
  });

  it('returns self for the current user', async () => {
    expect(await m.getPrayerCircleStatus('test-user')).toEqual({ state: 'self' });
  });
});

describe('getPrayerCircleUsernames', () => {
  it('returns usernames for both sides of mutual connections', async () => {
    setAlways([
      { user_a_id: 'test-user', user_b_id: 'u2', user_b: { username: 'mary' } },
      { user_a_id: 'u3', user_b_id: 'test-user', user_a: { username: 'john' } },
    ]);
    expect(await m.getPrayerCircleUsernames()).toEqual(['mary', 'john']);
  });

  it('returns empty if no user', async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await m.getPrayerCircleUsernames()).toEqual([]);
  });
});

describe('getPrayerCircleMemberIds', () => {
  it('returns mutual connection ids and can include the current user', async () => {
    setAlways([
      { user_a_id: 'test-user', user_b_id: 'u2' },
      { user_a_id: 'u3', user_b_id: 'test-user' },
    ]);

    expect(await m.getPrayerCircleMemberIds(true)).toEqual(['test-user', 'u2', 'u3']);
  });

  it('returns empty if no user', async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await m.getPrayerCircleMemberIds()).toEqual([]);
  });
});

describe('getPrayerCircle', () => {
  it('returns mutual circle profiles', async () => {
    setAlways([
      {
        user_a_id: 'test-user',
        user_b_id: 'u2',
        created_at: '2024-01-01',
        user_b: { id: 'u2', username: 'mary', display_name: 'Mary', avatar_url: null },
      },
      {
        user_a_id: 'u3',
        user_b_id: 'test-user',
        created_at: '2024-01-02',
        user_a: { id: 'u3', username: 'john', display_name: 'John', avatar_url: 'avatar.png' },
      },
    ]);
    const result = await m.getPrayerCircle();
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ id: 'u2', username: 'mary', connected_at: '2024-01-01' });
    expect(result[1]).toMatchObject({ id: 'u3', username: 'john', connected_at: '2024-01-02' });
  });
});

describe('getPrayerCircleInvites', () => {
  it('splits incoming and outgoing pending invites', async () => {
    setAlways([
      {
        id: 'incoming-1',
        requester_id: 'u2',
        recipient_id: 'test-user',
        message: 'Can we keep praying?',
        created_at: '2024-01-01',
        requester: { id: 'u2', username: 'mary', display_name: 'Mary', avatar_url: null },
        recipient: { id: 'test-user', username: 'me', display_name: 'Me', avatar_url: null },
      },
      {
        id: 'outgoing-1',
        requester_id: 'test-user',
        recipient_id: 'u3',
        message: null,
        created_at: '2024-01-02',
        requester: { id: 'test-user', username: 'me', display_name: 'Me', avatar_url: null },
        recipient: { id: 'u3', username: 'john', display_name: 'John', avatar_url: null },
      },
    ]);

    const result = await m.getPrayerCircleInvites();
    expect(result.incoming).toHaveLength(1);
    expect(result.incoming[0].requester.username).toBe('mary');
    expect(result.outgoing).toHaveLength(1);
    expect(result.outgoing[0].recipient.username).toBe('john');
  });

  it('returns empty invite lists if no user', async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await m.getPrayerCircleInvites()).toEqual({ incoming: [], outgoing: [] });
  });
});

describe('getPrayerCircleCount', () => {
  it('returns the mutual circle count', async () => {
    setAlways(null, null, 5);
    expect(await m.getPrayerCircleCount('uid1')).toBe(5);
  });
});

describe('createReport', () => {
  it('creates report on success', async () => {
    setAlways(null);
    expect(
      await m.createReport({ reportable_type: 'prayer', reportable_id: 'p1', reason: 'Spam' })
    ).toBe(true);
  });

  it('returns false if no user', async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(
      await m.createReport({ reportable_type: 'prayer', reportable_id: 'p1', reason: 'Spam' })
    ).toBe(false);
  });
});

describe('getPendingReports', () => {
  it('returns pending reports', async () => {
    setAlways([{ id: 'r1', reason: 'Spam' }]);
    const result = await m.getPendingReports();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('r1');
    expect(qb.eq).toHaveBeenCalledWith('status', 'pending');
  });

  it('returns empty on error', async () => {
    setAlways(null, new Error('fail'));
    expect(await m.getPendingReports()).toEqual([]);
  });
});

describe('getReports', () => {
  it('returns all reports without applying a status filter', async () => {
    setAlways([{ id: 'r1', reason: 'Spam' }]);
    const result = await m.getReports('all');
    expect(result).toHaveLength(1);
    expect(qb.eq).not.toHaveBeenCalledWith('status', expect.any(String));
  });
});

describe('resolveReport', () => {
  it('returns true on success', async () => {
    setAlways(null);
    expect(await m.resolveReport('r1', 'resolved', 'Reviewed')).toBe(true);
    expect(qb.update).toHaveBeenCalledWith({
      status: 'resolved',
      resolved_at: expect.any(String),
      resolved_by: 'test-user',
      moderator_note: 'Reviewed',
    });
  });

  it('returns false on error', async () => {
    setAlways(null, new Error('fail'));
    expect(await m.resolveReport('r1', 'dismissed')).toBe(false);
  });

  it('returns false if no user is signed in', async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await m.resolveReport('r1', 'dismissed')).toBe(false);
    expect(qb.update).not.toHaveBeenCalled();
  });
});

describe('isCurrentUserModerator', () => {
  it('returns true for moderator profiles', async () => {
    setAlways({ is_moderator: true });
    expect(await m.isCurrentUserModerator()).toBe(true);
  });

  it('returns false for non-moderator profiles', async () => {
    setAlways({ is_moderator: false });
    expect(await m.isCurrentUserModerator()).toBe(false);
  });

  it('returns false if no user', async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await m.isCurrentUserModerator()).toBe(false);
  });

  it('returns false on lookup error', async () => {
    setAlways(null, new Error('fail'));
    expect(await m.isCurrentUserModerator()).toBe(false);
  });
});

describe('updateProfile', () => {
  it('returns true on success', async () => {
    setAlways(null);
    expect(await m.updateProfile({ display_name: 'New Name' })).toBe(true);
  });

  it('returns false if no user', async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await m.updateProfile({ display_name: 'New Name' })).toBe(false);
  });
});

describe('getMyProfile', () => {
  it('returns profile on success', async () => {
    const profileData = {
      id: 'test-user',
      username: 'user1',
      display_name: 'User 1',
      avatar_url: null,
      bio: 'Hello',
      location: 'London',
      created_at: '2024-01-01',
    };
    setAlways(profileData);
    const result = await m.getMyProfile();
    expect(result).toEqual(profileData);
  });

  it('returns null if no user', async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await m.getMyProfile()).toBeNull();
  });

  it('returns null on error', async () => {
    setAlways(null, new Error('fail'));
    expect(await m.getMyProfile()).toBeNull();
  });
});

describe('getProfileByUsername', () => {
  it('returns profile on success', async () => {
    const profileData = {
      id: 'uid1',
      username: 'user1',
      display_name: 'User 1',
      avatar_url: null,
      created_at: '2024-01-01',
    };
    setAlways(profileData);
    const result = await m.getProfileByUsername('user1');
    expect(result).toEqual(profileData);
  });

  it('returns null when not found', async () => {
    setAlways(null, new Error('not found'));
    expect(await m.getProfileByUsername('nobody')).toBeNull();
  });
});

describe('getUserPrayers', () => {
  it('returns user prayers on success', async () => {
    setOnce({
      id: 'uid1',
      username: 'user1',
      display_name: 'User 1',
      avatar_url: null,
      created_at: '2024-01-01',
    });
    setOnce([
      {
        id: 'p1',
        body: 'Prayer',
        category: 'Other',
        location_city: 'NYC',
        location_country: 'US',
        location_lat: 40.7,
        location_lng: -74.0,
        is_anonymous: false,
        prayer_count: 3,
        created_at: '2024-01-01',
        comments_enabled: true,
      },
    ]);
    const result = await m.getUserPrayers('user1');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('p1');
    expect(result[0].username).toBe('user1');
  });

  it('returns empty if profile not found', async () => {
    setOnce(null, new Error('not found'));
    expect(await m.getUserPrayers('nonexistent')).toEqual([]);
  });
});

describe('searchUsers', () => {
  it('returns matching users on success', async () => {
    setAlways([{ username: 'testuser', display_name: 'Test User' }]);
    const result = await m.searchUsers('test');
    expect(result).toHaveLength(1);
    expect(result[0].username).toBe('testuser');
  });

  it('returns empty on error', async () => {
    setAlways(null, new Error('fail'));
    expect(await m.searchUsers('test')).toEqual([]);
  });
});

describe('toggleSavePrayer', () => {
  it('inserts when save=true', async () => {
    setAlways(null);
    expect(await m.toggleSavePrayer('p1', true)).toBe(true);
  });

  it('deletes when save=false', async () => {
    setAlways(null);
    expect(await m.toggleSavePrayer('p1', false)).toBe(true);
  });

  it('returns false if no user', async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await m.toggleSavePrayer('p1', true)).toBe(false);
  });
});

describe('getSavedPrayerIds', () => {
  it('returns saved IDs', async () => {
    setAlways([{ prayer_id: 'p1' }, { prayer_id: 'p2' }]);
    const result = await m.getSavedPrayerIds();
    expect(result).toEqual(['p1', 'p2']);
  });

  it('returns empty if no user', async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await m.getSavedPrayerIds()).toEqual([]);
  });
});

describe('getSavedPrayers', () => {
  it('returns saved prayers on success', async () => {
    setOnce([{ prayer_id: 'p1' }]);
    setOnce([
      {
        id: 'p1',
        body: 'Saved',
        category: 'Other',
        location_city: 'Berlin',
        location_country: 'Germany',
        location_lat: 52.5,
        location_lng: 13.4,
        is_anonymous: false,
        prayer_count: 1,
        created_at: '2024-01-01',
        comments_enabled: true,
        profiles: { username: 'u1', display_name: 'U1' },
      },
    ]);
    const result = await m.getSavedPrayers();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('p1');
  });

  it('returns empty if no saved IDs', async () => {
    setAlways([]);
    expect(await m.getSavedPrayers()).toEqual([]);
  });

  it('returns empty if no user', async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await m.getSavedPrayers()).toEqual([]);
  });
});

describe('getMyPrayers', () => {
  it('returns my prayers on success', async () => {
    setAlways([
      {
        id: 'p1',
        body: 'Mine',
        category: 'Other',
        location_city: 'Tokyo',
        location_country: 'Japan',
        location_lat: 35.7,
        location_lng: 139.7,
        is_anonymous: false,
        prayer_count: 2,
        comment_count: 4,
        created_at: '2024-01-01',
        comments_enabled: true,
      },
    ]);
    const result = await m.getMyPrayers();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('p1');
    expect(result[0].commentCount).toBe(4);
  });

  it('returns empty if no user', async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await m.getMyPrayers()).toEqual([]);
  });
});

describe('getMyPrayerCommentActivity', () => {
  it('counts comments from other people on my prayers', async () => {
    setAlways(
      [{ id: 'c1', created_at: '2024-01-03', prayer_requests: { user_id: 'test-user' } }],
      null,
      3
    );

    const result = await m.getMyPrayerCommentActivity();

    expect(result).toEqual({ commentCount: 3, latestCommentAt: '2024-01-03' });
    expect(qb.eq).toHaveBeenCalledWith('prayer_requests.user_id', 'test-user');
    expect(qb.neq).toHaveBeenCalledWith('user_id', 'test-user');
  });

  it('returns an empty activity summary if signed out', async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await m.getMyPrayerCommentActivity()).toEqual({
      commentCount: 0,
      latestCommentAt: null,
    });
  });
});

describe('getMyPrayedForPrayers', () => {
  it('returns prayed-for prayers on success', async () => {
    setAlways([
      {
        prayer_id: 'p1',
        prayer_requests: {
          id: 'p1',
          body: 'Prayed for',
          category: 'Other',
          location_city: 'Sydney',
          location_country: 'Australia',
          location_lat: -33.9,
          location_lng: 151.2,
          is_anonymous: false,
          prayer_count: 5,
          created_at: '2024-01-01',
          comments_enabled: true,
          profiles: { username: 'other', display_name: 'Other' },
        },
      },
    ]);
    const result = await m.getMyPrayedForPrayers();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('p1');
  });

  it('returns empty if no user', async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await m.getMyPrayedForPrayers()).toEqual([]);
  });
});

describe('subscribeToWaitlist', () => {
  it('returns "subscribed" on success', async () => {
    setAlways(null);
    expect(await m.subscribeToWaitlist('test@test.com')).toBe('subscribed');
  });

  it('returns "exists" on duplicate', async () => {
    qb.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ error: { code: '23505' } } as never)
    );
    expect(await m.subscribeToWaitlist('dup@test.com', 'landing')).toBe('exists');
  });

  it('returns "error" on other failure', async () => {
    qb.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ error: { code: 'PGRST116', message: 'other' } } as never)
    );
    expect(await m.subscribeToWaitlist('fail@test.com', 'info')).toBe('error');
  });
});

describe('toggleCommentsEnabled', () => {
  it('returns true on success', async () => {
    setAlways(null);
    expect(await m.toggleCommentsEnabled('p1', false)).toBe(true);
  });

  it('returns false on error', async () => {
    setAlways(null, new Error('fail'));
    expect(await m.toggleCommentsEnabled('p1', true)).toBe(false);
  });
});

describe('deleteAccount', () => {
  it('returns null on success', async () => {
    functionsInvoke.mockResolvedValue({ data: { success: true }, error: null });
    const result = await m.deleteAccount();
    expect(result).toBeNull();
    expect(functionsInvoke).toHaveBeenCalledWith('delete-account', {
      headers: { Authorization: 'Bearer t' },
    });
  });

  it('returns "Not authenticated" if no session', async () => {
    auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    expect(await m.deleteAccount()).toBe('Not authenticated');
  });

  it('returns error message on invoke failure', async () => {
    functionsInvoke.mockResolvedValue({ data: null, error: new Error('Failed to delete account') });
    const result = await m.deleteAccount();
    expect(result).toBe('Failed to delete account');
  });

  it('returns edge function error payloads', async () => {
    functionsInvoke.mockResolvedValue({ data: { error: 'Unable to delete account' }, error: null });
    await expect(m.deleteAccount()).resolves.toBe('Unable to delete account');
  });

  it('returns a retry message if the function request throws', async () => {
    functionsInvoke.mockRejectedValue(new Error('Failed to send a request to the Edge Function'));
    await expect(m.deleteAccount()).resolves.toBe(
      "We couldn't delete your account. Please check your connection and try again."
    );
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});

describe('getMyPrayedIds', () => {
  it('returns prayed IDs on success', async () => {
    setAlways([{ prayer_id: 'p1' }]);
    expect(await m.getMyPrayedIds()).toEqual(['p1']);
  });

  it('returns empty if no user', async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await m.getMyPrayedIds()).toEqual([]);
  });

  it('returns empty on error', async () => {
    setAlways(null, new Error('fail'));
    expect(await m.getMyPrayedIds()).toEqual([]);
  });
});

describe('getMySavedIds', () => {
  it('returns saved IDs on success', async () => {
    setAlways([{ prayer_id: 'p1' }]);
    expect(await m.getMySavedIds()).toEqual(['p1']);
  });

  it('returns empty if no user', async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await m.getMySavedIds()).toEqual([]);
  });

  it('returns empty on error', async () => {
    setAlways(null, new Error('fail'));
    expect(await m.getMySavedIds()).toEqual([]);
  });
});

describe('getProfilePreferences', () => {
  const defaults = {
    notify_on_prayed: true,
    notify_on_comment: true,
    language: 'auto',
    comments_enabled_default: true,
    profile_location_mode: 'manual',
  };

  it('returns merged preferences on success', async () => {
    setAlways({ preferences: { language: 'es', notify_on_prayed: false } });
    const result = await m.getProfilePreferences();
    expect(result.language).toBe('es');
    expect(result.notify_on_prayed).toBe(false);
    expect(result.notify_on_comment).toBe(true);
    expect(result.profile_location_mode).toBe('manual');
  });

  it('falls back to manual for an invalid location preference', async () => {
    setAlways({ preferences: { profile_location_mode: 'nearby' } });
    const result = await m.getProfilePreferences();
    expect(result.profile_location_mode).toBe('manual');
  });

  it('returns defaults if no user', async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await m.getProfilePreferences()).toEqual(defaults);
  });

  it('returns defaults on error', async () => {
    setAlways(null, new Error('fail'));
    expect(await m.getProfilePreferences()).toEqual(defaults);
  });
});

describe('updateProfilePreferences', () => {
  it('merges and updates preferences on success', async () => {
    setOnce({
      preferences: {
        notify_on_prayed: true,
        notify_on_comment: true,
        language: 'auto',
        comments_enabled_default: true,
        profile_location_mode: 'manual',
      },
    });
    setOnce(null);
    expect(
      await m.updateProfilePreferences({ language: 'fr', profile_location_mode: 'auto' })
    ).toBe(true);
  });

  it('returns false if no user', async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await m.updateProfilePreferences({ language: 'fr' })).toBe(false);
  });
});
