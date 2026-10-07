import { describe, expect, it } from 'vitest';
import {
  formatNoticeWindow,
  maintenanceWindowSchema,
  noticeDraftSchema,
} from '@oratio/shared/service-notice';

const maintenance = {
  startsAt: '2026-10-07T00:30:00.000Z',
  endsAt: '2026-10-07T02:30:00.000Z',
};

describe('notice maintenance times', () => {
  it('keeps maintenance times separate from the banner display period and optional', () => {
    const draft = {
      title: 'Maintenance',
      message: 'Some features may be temporarily unavailable.',
      startsAt: '2026-10-06T09:00:00.000Z',
      endsAt: '2026-10-07T03:00:00.000Z',
    };
    expect(noticeDraftSchema.parse(draft)).toEqual(draft);
    expect(noticeDraftSchema.parse({ ...draft, maintenance })).toEqual({ ...draft, maintenance });
  });

  it.each([
    {},
    { startsAt: maintenance.startsAt },
    { ...maintenance, startsAt: 'not-a-date' },
    { ...maintenance, startsAt: '2026-10-07T00:30' },
    { ...maintenance, endsAt: maintenance.startsAt },
    { startsAt: maintenance.endsAt, endsAt: maintenance.startsAt },
    { ...maintenance, timeZone: 'user-supplied-zone' },
  ])('rejects incomplete, ambiguous or reversed instants: %j', (value) => {
    expect(maintenanceWindowSchema.safeParse(value).success).toBe(false);
  });

  it('converts the same instants to the viewer timezone, including a different local day', () => {
    const newYork = formatNoticeWindow(maintenance, {
      locale: 'en-GB',
      timeZone: 'America/New_York',
    });
    expect(newYork).toMatch(/6 Oct 2026.*20:30.*GMT-4.*to.*6 Oct 2026.*22:30.*GMT-4/);
    const tokyo = formatNoticeWindow(maintenance, { locale: 'en-GB', timeZone: 'Asia/Tokyo' });
    expect(tokyo).toMatch(/7 Oct 2026.*09:30.*GMT\+9.*to.*7 Oct 2026.*11:30.*GMT\+9/);
  });

  it('preserves half-hour and quarter-hour offsets', () => {
    expect(
      formatNoticeWindow(maintenance, { locale: 'en-GB', timeZone: 'Asia/Kathmandu' })
    ).toMatch(/06:15.*GMT\+5:45.*to.*08:15.*GMT\+5:45/);
    expect(formatNoticeWindow(maintenance, { locale: 'en-GB', timeZone: 'Asia/Kolkata' })).toMatch(
      /06:00.*GMT\+5:30.*to.*08:00.*GMT\+5:30/
    );
  });

  it('shows each UTC offset across a repeated daylight-saving hour', () => {
    expect(
      formatNoticeWindow(
        { startsAt: '2026-11-01T05:30:00.000Z', endsAt: '2026-11-01T06:30:00.000Z' },
        { locale: 'en-GB', timeZone: 'America/New_York' }
      )
    ).toMatch(/01:30.*GMT-4.*to.*01:30.*GMT-5/);
  });

  it('keeps both dates and years when a window crosses midnight and New Year', () => {
    expect(
      formatNoticeWindow(
        { startsAt: '2026-12-31T23:30:00.000Z', endsAt: '2027-01-01T00:30:00.000Z' },
        { locale: 'en-GB', timeZone: 'Europe/London' }
      )
    ).toMatch(/31 Dec 2026.*23:30.*GMT.*to.*1 Jan 2027.*00:30.*GMT/);
  });

  it('uses the device locale and timezone by default', () => {
    const { locale, timeZone } = Intl.DateTimeFormat().resolvedOptions();
    expect(formatNoticeWindow(maintenance)).toBe(
      formatNoticeWindow(maintenance, { locale, timeZone })
    );
  });
});
