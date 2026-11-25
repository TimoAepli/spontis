import { ST_GALLEN, distanceKm, formatDistance } from './geo';
import { canSee, defaultVisibility, isInDiscoverRange } from './visibility';

describe('Sichtbarkeit', () => {
  it('Standard: Sport = «Alle in der Nähe», sonst «Nur Freunde»', () => {
    expect(defaultVisibility('sport')).toBe('nearby');
    expect(defaultVisibility('ausgang')).toBe('friends');
    expect(defaultVisibility('essen')).toBe('friends');
    expect(defaultVisibility('kultur')).toBe('friends');
    expect(defaultVisibility('anderes')).toBe('friends');
  });

  const friends = new Set(['ben']);
  const onlyFriends = { creatorId: 'anna', visibility: 'friends' as const };
  const nearby = { creatorId: 'anna', visibility: 'nearby' as const };

  it('«Nur Freunde»: Ersteller und Freunde sehen sie, andere nicht', () => {
    expect(canSee(onlyFriends, 'anna', new Set())).toBe(true);
    expect(canSee(onlyFriends, 'ben', new Set(['anna']))).toBe(true);
    expect(canSee(onlyFriends, 'cem', friends)).toBe(false);
  });

  it('«Alle in der Nähe»: alle sehen sie', () => {
    expect(canSee(nearby, 'cem', new Set())).toBe(true);
  });

  it('«Alle in der Nähe» nur im Umkreis von 15 km', () => {
    const rorschach = { lat: 47.478, lng: 9.49, visibility: 'nearby' as const }; // ca. 10 km
    const zuerich = { lat: 47.3769, lng: 8.5417, visibility: 'nearby' as const }; // ca. 63 km
    expect(isInDiscoverRange(rorschach, ST_GALLEN)).toBe(true);
    expect(isInDiscoverRange(zuerich, ST_GALLEN)).toBe(false);
  });

  it('«Nur Freunde» erscheint unabhängig von der Distanz', () => {
    const weitWeg = { lat: 47.3769, lng: 8.5417, visibility: 'friends' as const };
    expect(isInDiscoverRange(weitWeg, ST_GALLEN)).toBe(true);
  });
});

describe('Distanz', () => {
  it('rechnet Luftlinie in km', () => {
    const km = distanceKm(ST_GALLEN, { lat: 47.3769, lng: 8.5417 });
    expect(km).toBeGreaterThan(60);
    expect(km).toBeLessThan(66);
  });

  it('formatiert Meter und Kilometer', () => {
    expect(formatDistance(0.34)).toBe('300 m');
    expect(formatDistance(2.44)).toBe('2.4 km');
  });
});
