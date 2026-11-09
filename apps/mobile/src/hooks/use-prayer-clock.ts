import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

// Re-evaluate loaded prayers at their deadlines and after returning from background.
export function usePrayerClock(prayers: readonly { expiresAt?: string }[]): number {
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
    tick();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') tick();
    });
    return () => {
      if (timer) clearTimeout(timer);
      subscription.remove();
    };
  }, [deadlines]);
  return now;
}
