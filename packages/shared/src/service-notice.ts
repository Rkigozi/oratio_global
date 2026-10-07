import { z } from 'zod';

export const NOTICE_TITLE_LIMIT = 60;
export const NOTICE_MESSAGE_LIMIT = 240;
export const NOTICE_REFRESH_MS = 60_000;

const text = (limit: number) =>
  z
    .string()
    .trim()
    .min(1)
    .refine((value) => Array.from(value).length <= limit);

export const maintenanceWindowSchema = z
  .object({ startsAt: z.iso.datetime(), endsAt: z.iso.datetime() })
  .strict()
  .refine((value) => Date.parse(value.endsAt) > Date.parse(value.startsAt), {
    message: 'Maintenance must end after it starts.',
  });

export const noticeDraftSchema = z
  .object({
    title: text(NOTICE_TITLE_LIMIT),
    message: text(NOTICE_MESSAGE_LIMIT),
    startsAt: z.iso.datetime(),
    endsAt: z.iso.datetime(),
    maintenance: maintenanceWindowSchema.optional(),
  })
  .strict()
  .refine((value) => Date.parse(value.endsAt) > Date.parse(value.startsAt), {
    message: 'Expiry must be after the display start.',
  })
  .refine((value) => Date.parse(value.endsAt) - Date.parse(value.startsAt) <= 7 * 86400_000, {
    message: 'A notice can be displayed for at most seven days.',
  });

export const serviceNoticeSchema = noticeDraftSchema.safeExtend({ id: z.uuid() });
export const noticeEnvelopeSchema = z.object({ notice: serviceNoticeSchema.nullable() });
export type NoticeDraft = z.infer<typeof noticeDraftSchema>;
export type ServiceNotice = z.infer<typeof serviceNoticeSchema>;

export function formatNoticeWindow(
  window: { startsAt: string; endsAt: string },
  { locale, timeZone }: { locale?: string; timeZone?: string } = {}
) {
  // Format both instants independently: their local dates and UTC offsets can differ.
  const formatter = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
    ...(timeZone ? { timeZone } : {}),
  });
  return `${formatter.format(new Date(window.startsAt))} to ${formatter.format(new Date(window.endsAt))}`;
}

export function noticeStatus(notice: ServiceNotice | null, now = Date.now()) {
  if (!notice) return 'off';
  if (now >= Date.parse(notice.endsAt)) return 'expired';
  return now < Date.parse(notice.startsAt) ? 'scheduled' : 'visible';
}

export async function fetchServiceNotice(url: string, signal?: AbortSignal) {
  const response = await fetch(url, { signal, cache: 'no-store' });
  if (!response.ok) throw new Error('Notice unavailable');
  const parsed = noticeEnvelopeSchema.parse(await response.json());
  return parsed.notice;
}
