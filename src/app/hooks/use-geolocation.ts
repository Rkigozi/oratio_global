import { useState, useCallback } from "react";

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
      if (cached) return JSON.parse(cached) as LocationInfo;
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

      const info: LocationInfo = {
        city: address.city || address.town || address.village || address.county || "Unknown",
        country: address.country || "Unknown",
        lat,
        lng,
      };

      sessionStorage.setItem("oratio_location", JSON.stringify(info));
      setLocation(info);
      return info;
    } catch (err) {
      const isPermission = err instanceof GeolocationPositionError && err.code === GeolocationPositionError.PERMISSION_DENIED;
      const isTimeout = err instanceof GeolocationPositionError && err.code === GeolocationPositionError.TIMEOUT;
      setDenied(true);
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
