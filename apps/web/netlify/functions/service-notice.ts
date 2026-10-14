import { getStore } from '@netlify/blobs';
import { createNoticeHandler, type NoticeRecord } from '../../server/service-notice';

type DeployContext = { deploy?: { context?: string; id?: string; published?: boolean } };

export default async function handler(request: Request, context: DeployContext = {}) {
  // Use trusted runtime context: build-only environment variables are not available here.
  // Unpublished/preview deploys must never write the live notice store.
  const deploy = context.deploy;
  const environment =
    deploy?.context === 'production' && deploy.published ? 'production' : deploy?.id;
  const store = () => {
    if (!environment) throw new Error('Missing deploy context');
    return getStore({ name: `service-notices-${environment}`, consistency: 'strong' });
  };
  const adminIds = new Set(
    (process.env.ORATIO_NOTICE_ADMIN_IDS ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean)
  );
  return createNoticeHandler({
    store: {
      read: async () => {
        const result = await store().getWithMetadata('current', { type: 'json' });
        if (!result) return null;
        if (!result.etag) throw new Error('Missing notice version');
        return { data: result.data as NoticeRecord, etag: result.etag };
      },
      write: async (record, version) => {
        const result = await store().setJSON(
          'current',
          record,
          version ? { onlyIfMatch: version } : { onlyIfNew: true }
        );
        return result.modified;
      },
    },
    authorize: (id) => Promise.resolve(adminIds.has(id)),
    userId: async (token) => {
      const url = process.env.SUPABASE_URL;
      const key = process.env.SUPABASE_ANON_KEY;
      if (!url || !key) throw new Error('Notice authentication is not configured');
      const response = await fetch(`${url.replace(/\/$/, '')}/auth/v1/user`, {
        headers: { apikey: key, Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(5000),
      });
      if (response.status === 401 || response.status === 403) return null;
      if (!response.ok) throw new Error('Authentication unavailable');
      const user = (await response.json()) as { id?: unknown };
      return typeof user.id === 'string' ? user.id : null;
    },
  })(request);
}
