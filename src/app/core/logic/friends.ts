/** Antwort der Datenbank-Funktion request_friend(). */
export type FriendRequestResult = 'requested' | 'accepted' | 'pending' | 'already_friends' | 'self' | 'not_found';

/**
 * Macht aus der Eingabe einen Einladungscode: Gross-/Kleinschreibung und Leerzeichen egal.
 * Funktioniert auch, wenn jemand den ganzen Link einfügt (…/f/AB12CD).
 */
export function normalizeInviteCode(input: string): string {
  const fromLink = /\/f\/([A-Za-z0-9]+)/.exec(input);
  const raw = fromLink ? fromLink[1] : input;
  return raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

/** Einladungscodes sind 6 Zeichen lang (0–9, A–F). */
export function isValidInviteCode(code: string): boolean {
  return /^[0-9A-F]{6}$/.test(code);
}

/** Meldung für die Person, die den Code eingegeben hat. */
export function friendRequestMessage(result: FriendRequestResult, name?: string): string {
  const who = name ?? 'diese Person';
  switch (result) {
    case 'requested':
      return `Anfrage an ${who} gesendet. Sobald die Anfrage angenommen ist, seht ihr eure «Nur Freunde»-Aktivitäten.`;
    case 'accepted':
      return `Du und ${who} seid jetzt Freunde.`;
    case 'pending':
      return `Du hast ${who} schon angefragt. Die Anfrage ist noch offen.`;
    case 'already_friends':
      return `Du und ${who} seid schon Freunde.`;
    case 'self':
      return 'Das ist dein eigener Code.';
    case 'not_found':
      return 'Diesen Code gibt es nicht. Prüfe die Schreibweise.';
  }
}

export interface FriendOfferInput {
  /** Wurde die Aktivität über einen geteilten Link geöffnet? */
  viaLink: boolean;
  /** Angemeldete Person (null = nicht angemeldet) */
  viewerId: string | null;
  /** Gäste bekommen kein Pop-up (sie sollen sich zuerst registrieren) */
  viewerIsGuest?: boolean;
  creatorId: string;
  /** Meine Freundschaften (angenommen oder offen) */
  friends: readonly { userId: string; status: 'pending' | 'accepted'; direction: 'incoming' | 'outgoing' }[];
}

/**
 * Pop-up «Freundschaftsanfrage senden?» beim Öffnen eines Links:
 * nur wenn angemeldet (nicht als Gast), nicht die eigene Aktivität, noch nicht befreundet
 * und noch keine eigene Anfrage offen. (Hat der Ersteller mich schon angefragt,
 * wird die Anfrage damit angenommen.)
 */
export function shouldOfferFriendship(i: FriendOfferInput): boolean {
  if (!i.viaLink || !i.viewerId || i.viewerIsGuest || i.viewerId === i.creatorId) return false;
  const existing = i.friends.find((f) => f.userId === i.creatorId);
  if (!existing) return true;
  return existing.status === 'pending' && existing.direction === 'incoming';
}

/** Ist die Meldung ein Erfolg (grün) oder ein Hinweis/Fehler? */
export function isFriendRequestSuccess(result: FriendRequestResult): boolean {
  return result === 'requested' || result === 'accepted' || result === 'already_friends';
}
