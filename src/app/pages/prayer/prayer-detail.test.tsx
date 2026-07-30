import { describe, expect, it } from 'vitest';
import { getPrayerReportStatusTitle } from './prayer-detail';

describe('getPrayerReportStatusTitle', () => {
  it('labels duplicate report feedback clearly', () => {
    expect(
      getPrayerReportStatusTitle(
        "You've already reported this prayer. It's still saved for moderation.",
        null
      )
    ).toBe('Already reported');
  });

  it('keeps normal success and error titles clear', () => {
    expect(getPrayerReportStatusTitle('Thanks. Your report is saved for moderation.', null)).toBe(
      'Report sent'
    );
    expect(getPrayerReportStatusTitle(null, "We couldn't send that report.")).toBe(
      'Report not sent'
    );
  });
});
