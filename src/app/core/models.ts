/** Profil einer Person (Tabelle `profiles`). */
export interface Profile {
  id: string;
  /** null = Gast (nur mit Anzeigename über einen Link beigetreten) */
  username: string | null;
  first_name: string;
  invite_code: string;
}

export type Category = 'sport' | 'ausgang' | 'essen' | 'kultur' | 'anderes';
export type Visibility = 'friends' | 'nearby';

/** Aktivität, wie sie die App anzeigt (aus der View `activity_feed`). */
export interface Activity {
  id: string;
  creatorId: string;
  creatorFirstName: string;
  creatorInviteCode: string;
  category: Category;
  title: string;
  startsAt: Date;
  lat: number;
  lng: number;
  placeName: string;
  minParticipants: number;
  visibility: Visibility;
  isSponsored: boolean;
  participantCount: number;
  isJoined: boolean;
}

/** Eine zugesagte Person. */
export interface Participant {
  userId: string;
  firstName: string;
  joinedAt: Date;
}

/** Eine Freundschaft aus meiner Sicht. */
export interface Friend {
  /** Die andere Person */
  userId: string;
  firstName: string;
  username: string;
  status: 'pending' | 'accepted';
  /** incoming = die andere Person hat mich angefragt */
  direction: 'incoming' | 'outgoing';
}

/** Anzeige-Infos pro Kategorie. */
export const CATEGORIES: Record<Category, { label: string; emoji: string }> = {
  sport: { label: 'Sport', emoji: '⚽' },
  ausgang: { label: 'Ausgang', emoji: '🍻' },
  essen: { label: 'Essen', emoji: '🍝' },
  kultur: { label: 'Kultur', emoji: '🎭' },
  anderes: { label: 'Anderes', emoji: '✨' },
};

export const VISIBILITY_LABELS: Record<Visibility, string> = {
  friends: 'Nur Freunde',
  nearby: 'Alle in der Nähe',
};
