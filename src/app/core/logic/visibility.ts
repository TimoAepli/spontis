import { Category, Visibility } from '../models';
import { distanceKm, LatLng, NEARBY_RADIUS_KM } from './geo';

/**
 * Sichtbarkeitsregeln.
 * Die eigentliche Sicherheit liegt in der Datenbank (RLS). Diese Funktionen
 * bilden dieselben Regeln in der App ab – für Standardwerte, den Demo-Modus
 * und die Unit-Tests.
 */

/** Standard beim Erstellen: Sport = «Alle in der Nähe», alles andere = «Nur Freunde». */
export function defaultVisibility(category: Category): Visibility {
  return category === 'sport' ? 'nearby' : 'friends';
}

export interface VisibilityInput {
  creatorId: string;
  visibility: Visibility;
}

/** Darf `viewerId` die Aktivität sehen? (gleiche Regel wie Policy `activities_select`) */
export function canSee(activity: VisibilityInput, viewerId: string, friendIds: ReadonlySet<string>): boolean {
  if (activity.creatorId === viewerId) return true;
  if (activity.visibility === 'nearby') return true;
  return friendIds.has(activity.creatorId);
}

export interface NearbyInput extends LatLng {
  visibility: Visibility;
}

/**
 * Filter für die Entdecken-Ansicht: «Nur Freunde»-Aktivitäten immer zeigen,
 * «Alle in der Nähe» nur im Umkreis um `center`.
 */
export function isInDiscoverRange(activity: NearbyInput, center: LatLng, radiusKm = NEARBY_RADIUS_KM): boolean {
  if (activity.visibility === 'friends') return true;
  return distanceKm(center, activity) <= radiusKm;
}
