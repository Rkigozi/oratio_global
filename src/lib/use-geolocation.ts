import { useState, useCallback } from "react";

export interface LocationInfo {
  city: string;
  country: string;
  lat: number;
  lng: number;
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
  const [denied, setDenied] = useState(() => {
    try { return localStorage.getItem("oratio_location_denied") === "1"; }
    catch { return false; }
  });

  const requestLocation = useCallback(async () => {
    if (loading || denied) return null;
    setLoading(true);

    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 300000,
        });
      });

      const { latitude: lat, longitude: lng } = pos.coords;

      // Reverse geocode via Nominatim
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&accept-language=en`,
        { headers: { "User-Agent": "Oratio/1.0" } }
      );
      const data = await res.json();
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
    } catch {
      localStorage.setItem("oratio_location_denied", "1");
      setDenied(true);
      return null;
    } finally {
      setLoading(false);
    }
  }, [loading, denied]);

  const resetDenied = useCallback(() => {
    localStorage.removeItem("oratio_location_denied");
    setDenied(false);
  }, []);

  return { location, loading, denied, requestLocation, resetDenied };
}
