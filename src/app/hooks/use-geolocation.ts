import { useState, useCallback } from "react";
import { normalizePrayerLocation } from "../services/prayer-data";

export interface LocationInfo {
  city: string;
  country: string;
  lat: number;
  lng: number;
}

interface ReverseGeocodeResponse {
  address?: {
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    country?: string;
  };
}

export function useGeolocation() {
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<LocationInfo | null>(() => {
    try {
      const cached = sessionStorage.getItem("oratio_location");
      if (cached) {
        const parsed = JSON.parse(cached) as LocationInfo;
        return { ...parsed, ...normalizePrayerLocation(parsed.city, parsed.country) };
      }
    } catch {
      // ignore
    }
    return null;
  });
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestLocation = useCallback(async () => {
    if (loading) return null;
    setLoading(true);
    setDenied(false);
    setError(null);

    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 15000,
          maximumAge: 600000,
        });
      });

      const { latitude: lat, longitude: lng } = pos.coords;

      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&accept-language=en`,
        { headers: { "User-Agent": "Oratio/1.0" } }
      );
      const data = (await res.json()) as ReverseGeocodeResponse;
      const address = data.address || {};
      const location = normalizePrayerLocation(
        address.city || address.town || address.village || address.county || "Unknown",
        address.country || "Unknown"
      );

      const info: LocationInfo = {
        city: location.city,
        country: location.country,
        lat,
        lng,
      };

      sessionStorage.setItem("oratio_location", JSON.stringify(info));
      setLocation(info);
      return info;
    } catch (err) {
      const code = typeof err === "object" && err !== null && "code" in err
        ? Number((err as { code?: unknown }).code)
        : undefined;
      const isPermission = code === 1;
      const isTimeout = code === 3;
      setDenied(isPermission);
      setError(
        isPermission
          ? "permission"
          : isTimeout
            ? "timeout"
            : "error"
      );
      return null;
    } finally {
      setLoading(false);
    }
  }, [loading]);

  const resetDenied = useCallback(() => {
    setDenied(false);
    setError(null);
  }, []);

  return { location, loading, denied, error, requestLocation, resetDenied };
}
