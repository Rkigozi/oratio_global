export function getPrayerReportStatusTitle(reportNotice: string | null, reportError: string | null) {
  if (reportError) return 'Report not sent';
  if (reportNotice?.startsWith("You've already")) return 'Already reported';
  return 'Report sent';
}
