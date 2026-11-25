import { Injectable } from '@angular/core';

/** Ein Ort aus der Suche. */
export interface Place {
  lat: number;
  lng: number;
  /** Kurzer Name für die Aktivität, z. B. «Kreuzbleiche» oder «Marktgasse 12». */
  name: string;
  /** Zusatzzeile in der Trefferliste, z. B. «St. Gallen». */
  detail: string;
}

interface NominatimResult {
  lat: string;
  lon: string;
  name?: string;
  display_name: string;
  address?: Record<string, string>;
}

const BASE = 'https://nominatim.openstreetmap.org';
// Region St. Gallen bevorzugen (links, oben, rechts, unten), aber nicht ausschliessen.
const VIEWBOX = '9.20,47.50,9.55,47.35';

/**
 * Ortssuche über Nominatim (OpenStreetMap). Gratis, ohne API-Key.
 * Nutzungsregeln: höchstens 1 Anfrage pro Sekunde → die Suche wartet, bis man aufhört zu tippen.
 */
@Injectable({ providedIn: 'root' })
export class GeocodingService {
  async search(query: string): Promise<Place[]> {
    const q = query.trim();
    if (q.length < 3) return [];
    const params = new URLSearchParams({
      q,
      format: 'jsonv2',
      addressdetails: '1',
      countrycodes: 'ch',
      viewbox: VIEWBOX,
      bounded: '0',
      limit: '5',
      'accept-language': 'de',
    });
    const res = await fetch(`${BASE}/search?${params}`);
    if (!res.ok) throw new Error(`Ortssuche: ${res.status}`);
    const results = (await res.json()) as NominatimResult[];
    return results.map(toPlace);
  }

  /** Name für einen Punkt auf der Karte (umgekehrte Suche). */
  async reverse(lat: number, lng: number): Promise<string> {
    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lng),
      format: 'jsonv2',
      addressdetails: '1',
      zoom: '18',
      'accept-language': 'de',
    });
    const res = await fetch(`${BASE}/reverse?${params}`);
    if (!res.ok) return '';
    const result = (await res.json()) as NominatimResult;
    return result?.display_name ? toPlace(result).name : '';
  }
}

export function toPlace(r: NominatimResult): Place {
  const a = r.address ?? {};
  const street = a['road'] ? [a['road'], a['house_number']].filter(Boolean).join(' ') : '';
  const name = r.name || street || a['square'] || a['suburb'] || r.display_name.split(',')[0];
  const city = a['city'] || a['town'] || a['village'] || a['municipality'] || '';
  const detail = [street && street !== name ? street : '', city].filter(Boolean).join(', ');
  return { lat: Number(r.lat), lng: Number(r.lon), name: name.trim(), detail };
}
