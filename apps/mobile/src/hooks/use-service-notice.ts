import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import {
  fetchServiceNotice,
  noticeEnvelopeSchema,
  noticeStatus,
  NOTICE_REFRESH_MS,
  type ServiceNotice,
} from '@oratio/shared/service-notice';
import { ORATIO_WEB_URL } from '../services/external-links';

const DEFAULT_URL = `${ORATIO_WEB_URL}/.netlify/functions/service-notice`;

export function useServiceNotice(url = process.env.EXPO_PUBLIC_SERVICE_NOTICE_URL || DEFAULT_URL) {
  const [notice, setNotice] = useState<ServiceNotice | null>(null);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const dismissedLocally = useRef(false);
  const [now, setNow] = useState(Date.now);
  const cacheKey = `oratio:service-notice:${url}`;
  const dismissedKey = `${cacheKey}:dismissed`;

  useEffect(() => {
    let active = true;
    let fetched = false;
    let inFlight = false;
    let controller: AbortController | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    void AsyncStorage.getItem(cacheKey)
      .then((value) => {
        if (!active || fetched || !value) return;
        const parsed = noticeEnvelopeSchema.safeParse(JSON.parse(value));
        if (parsed.success) setNotice(parsed.data.notice);
      })
      .catch(() => undefined);
    void AsyncStorage.getItem(dismissedKey)
      .then((value) => {
        if (active && !dismissedLocally.current) setDismissed(value);
      })
      .catch(() => undefined);

    const refresh = async () => {
      if (
        !active ||
        inFlight ||
        AppState.currentState === 'background' ||
        AppState.currentState === 'inactive'
      )
        return;
      inFlight = true;
      setNow(Date.now());
      controller = new AbortController();
      timeout = setTimeout(() => controller?.abort(), 6000);
      try {
        const next = await fetchServiceNotice(url, controller.signal);
        if (!active) return;
        fetched = true;
        setNotice(next);
        void AsyncStorage.setItem(cacheKey, JSON.stringify({ notice: next })).catch(
          () => undefined
        );
      } catch {
        // A notice is best-effort. Keep an unexpired cached copy without blocking the app.
      } finally {
        clearTimeout(timeout);
        inFlight = false;
      }
    };
    void refresh();
    const interval = setInterval(() => void refresh(), NOTICE_REFRESH_MS);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    return () => {
      active = false;
      controller?.abort();
      clearTimeout(timeout);
      clearInterval(interval);
      subscription.remove();
    };
  }, [url, cacheKey, dismissedKey]);

  useEffect(() => {
    if (!notice) return;
    const next = [Date.parse(notice.startsAt), Date.parse(notice.endsAt)].find((at) => at > now);
    if (!next) return;
    const timer = setTimeout(
      () => setNow(Date.now()),
      Math.min(Math.max(1, next - Date.now()), 2147483647)
    );
    return () => clearTimeout(timer);
  }, [notice, now]);

  const visible =
    noticeStatus(notice, now) === 'visible' && notice?.id !== dismissed ? notice : null;
  return {
    notice: visible,
    dismiss: () => {
      if (!notice) return;
      dismissedLocally.current = true;
      setDismissed(notice.id);
      void AsyncStorage.setItem(dismissedKey, notice.id).catch(() => undefined);
    },
  };
}
