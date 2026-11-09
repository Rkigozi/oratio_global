import { useEffect, useState } from 'react';
import type { PrayerRequest } from '../services/prayer-data';

export function usePrayerClock(prayers: readonly PrayerRequest[]): number {
  const [now, setNow] = useState(Date.now);
  const deadlines = JSON.stringify(prayers.map((prayer) => prayer.expiresAt || null).sort());
  useEffect(() => {
    const times = (JSON.parse(deadlines) as Array<string | null>)
      .filter((value): value is string => Boolean(value))
      .map(Date.parse)
      .filter(Number.isFinite);
    if (times.length === 0) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = () => {
      if (timer) clearTimeout(timer);
      const current = Date.now();
      setNow(current);
      const next = Math.min(...times.filter((time) => time > current));
      if (Number.isFinite(next)) timer = setTimeout(tick, Math.min(next - current + 1, 86_400_000));
    };
    const resume = () => {
      if (document.visibilityState === 'visible') tick();
    };
    tick();
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('focus', tick);
    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', resume);
      window.removeEventListener('focus', tick);
    };
  }, [deadlines]);
  return now;
}
