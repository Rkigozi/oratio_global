import { z } from 'zod';
import { serviceNoticeSchema, type NoticeDraft } from '@oratio/shared/service-notice';
import { supabase } from './supabase';

const endpoint = '/.netlify/functions/service-notice?manage=1';
const stateSchema = z.object({
  notice: serviceNoticeSchema.nullable(),
  version: z.string().nullable(),
  updatedAt: z.string().nullable(),
});
export type NoticeAdminState = z.infer<typeof stateSchema>;

export class NoticeApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

async function request(method = 'GET', body?: unknown) {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new NoticeApiError('Sign in again to manage notices.', 401);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(endpoint, {
      method,
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${data.session.access_token}`,
        'Content-Type': 'application/json',
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const result: unknown = await response.json();
    if (!response.ok) {
      const error = z.object({ error: z.string() }).safeParse(result);
      throw new NoticeApiError(
        error.success ? error.data.error : 'Could not update notices.',
        response.status
      );
    }
    return result;
  } catch (error) {
    if (error instanceof NoticeApiError) throw error;
    throw new NoticeApiError(
      'The notice service could not be reached. Your draft has been kept.',
      503
    );
  } finally {
    clearTimeout(timeout);
  }
}

export async function getNoticeAdminState() {
  return stateSchema.parse(await request());
}
export async function saveServiceNotice(notice: NoticeDraft | null, version: string | null) {
  await request('PUT', { notice, version });
}
