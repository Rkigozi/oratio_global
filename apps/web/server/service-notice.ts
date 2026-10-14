import { randomUUID } from 'node:crypto';
import { z } from 'zod';
// Bundle workspace TypeScript into the function instead of tracing it as a Node dependency.
import { noticeDraftSchema, type ServiceNotice } from '../../../packages/shared/src/service-notice';

export type NoticeRecord = {
  notice: ServiceNotice | null;
  updatedAt: string;
  updatedBy: string;
};
export type NoticeStore = {
  read: () => Promise<{ data: NoticeRecord; etag: string } | null>;
  write: (record: NoticeRecord, version: string | null) => Promise<boolean>;
};
type Dependencies = {
  store: NoticeStore;
  authorize: (userId: string) => Promise<boolean>;
  userId: (token: string) => Promise<string | null>;
};

const mutationSchema = z
  .object({
    version: z.string().min(1).max(256).nullable(),
    notice: noticeDraftSchema.nullable(),
  })
  .strict();

function reply(body: unknown, status = 200, publicRead = false) {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...(publicRead ? { 'Access-Control-Allow-Origin': '*' } : {}),
    },
  });
}

export function createNoticeHandler({ store, authorize, userId }: Dependencies) {
  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    const publicRead = request.method === 'GET' && !url.searchParams.has('manage');
    if (request.method !== 'GET' && request.method !== 'PUT') {
      return reply({ error: 'Method not allowed.' }, 405);
    }
    try {
      if (publicRead) {
        const record = await store.read();
        const notice = record?.data.notice;
        return reply(
          { notice: notice && Date.parse(notice.endsAt) > Date.now() ? notice : null },
          200,
          true
        );
      }

      const origin = request.headers.get('origin');
      if (origin && origin !== url.origin) return reply({ error: 'Not permitted.' }, 403);
      const token = request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
      if (!token) return reply({ error: 'Sign in again to manage notices.' }, 401);
      const id = await userId(token);
      if (!id) return reply({ error: 'Sign in again to manage notices.' }, 401);
      if (!(await authorize(id)))
        return reply({ error: 'Notice administrator access required.' }, 403);

      if (request.method === 'GET') {
        const record = await store.read();
        return reply({
          notice: record?.data.notice ?? null,
          version: record?.etag ?? null,
          updatedAt: record?.data.updatedAt ?? null,
        });
      }

      if (!request.headers.get('content-type')?.startsWith('application/json')) {
        return reply({ error: 'Expected JSON.' }, 415);
      }
      // Bound the actual streamed body, not just the caller-supplied length header.
      const reader = request.body?.getReader();
      if (!reader) return reply({ error: 'Missing notice.' }, 400);
      const chunks: Uint8Array[] = [];
      let length = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > 8192) {
          await reader.cancel();
          return reply({ error: 'Notice is too large.' }, 413);
        }
        chunks.push(value);
      }
      let payload: unknown;
      try {
        payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      } catch {
        return reply({ error: 'Invalid JSON.' }, 400);
      }
      const parsed = mutationSchema.safeParse(payload);
      if (
        !parsed.success ||
        (parsed.data.notice && Date.parse(parsed.data.notice.endsAt) <= Date.now())
      ) {
        return reply(
          {
            error:
              'Check the message limits, maintenance times and display times with a future expiry (maximum seven days).',
          },
          400
        );
      }
      const record: NoticeRecord = {
        notice: parsed.data.notice ? { ...parsed.data.notice, id: randomUUID() } : null,
        updatedAt: new Date().toISOString(),
        updatedBy: id,
      };
      if (!(await store.write(record, parsed.data.version))) {
        return reply(
          { error: 'This notice changed elsewhere. Reload before publishing again.' },
          409
        );
      }
      return reply({ saved: true });
    } catch {
      // Do not expose credentials, upstream responses or unpublished data.
      return reply(
        { error: 'Notices are temporarily unavailable. Please try again.' },
        503,
        publicRead
      );
    }
  };
}
