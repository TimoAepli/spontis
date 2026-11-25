/** Geografie-Hilfen. Der eigene Standort wird nur im Browser verwendet, nie gespeichert. */
export interface LatLng {
  lat: number;
  lng: number;
}

/** Zentrum St. Gallen (Marktplatz) – Standard, wenn kein Standort freigegeben ist. */
export const ST_GALLEN: LatLng = { lat: 47.4245, lng: 9.3767 };

/** Umkreis für «Alle in der Nähe». */
export const NEARBY_RADIUS_KM = 15;

/** Luftlinie in km (Haversine-Formel). */
export function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** «350 m» oder «2.4 km» */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 10) * 100} m`;
  return `${km.toFixed(1)} km`;
}
