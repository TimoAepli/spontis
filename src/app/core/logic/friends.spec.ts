import {
  friendRequestMessage,
  isFriendRequestSuccess,
  isValidInviteCode,
  normalizeInviteCode,
  shouldOfferFriendship,
} from './friends';

describe('Pop-up Freundschaftsanfrage bei Linkaufruf', () => {
  const base = { viaLink: true, viewerId: 'me', creatorId: 'lea', friends: [] };

  it('erscheint, wenn angemeldet und noch nicht befreundet', () => {
    expect(shouldOfferFriendship(base)).toBe(true);
  });

  it('erscheint nicht für Gäste', () => {
    expect(shouldOfferFriendship({ ...base, viewerIsGuest: true })).toBe(false);
  });

  it('erscheint nicht ohne Link, ohne Anmeldung oder bei eigener Aktivität', () => {
    expect(shouldOfferFriendship({ ...base, viaLink: false })).toBe(false);
    expect(shouldOfferFriendship({ ...base, viewerId: null })).toBe(false);
    expect(shouldOfferFriendship({ ...base, creatorId: 'me' })).toBe(false);
  });

  it('erscheint nicht, wenn schon befreundet oder schon angefragt', () => {
    const accepted = { userId: 'lea', status: 'accepted' as const, direction: 'outgoing' as const };
    const outgoing = { userId: 'lea', status: 'pending' as const, direction: 'outgoing' as const };
    expect(shouldOfferFriendship({ ...base, friends: [accepted] })).toBe(false);
    expect(shouldOfferFriendship({ ...base, friends: [outgoing] })).toBe(false);
  });

  it('erscheint, wenn der Ersteller mich angefragt hat (Anfrage wird damit angenommen)', () => {
    const incoming = { userId: 'lea', status: 'pending' as const, direction: 'incoming' as const };
    expect(shouldOfferFriendship({ ...base, friends: [incoming] })).toBe(true);
  });
});

describe('Einladungscode', () => {
  it('ignoriert Gross-/Kleinschreibung und Leerzeichen', () => {
    expect(normalizeInviteCode(' ab12 cd ')).toBe('AB12CD');
  });

  it('liest den Code aus einem eingefügten Link', () => {
    expect(normalizeInviteCode('https://spontis.netlify.app/f/ab12cd')).toBe('AB12CD');
  });

  it('prüft das Format (6 Zeichen, 0–9 und A–F)', () => {
    expect(isValidInviteCode('49389C')).toBe(true);
    expect(isValidInviteCode('49389')).toBe(false);
    expect(isValidInviteCode('ZZZZZZ')).toBe(false);
  });
});

describe('Meldungen zur Freundschaftsanfrage', () => {
  it('nennt den Namen', () => {
    expect(friendRequestMessage('accepted', 'Lea')).toBe('Du und Lea seid jetzt Freunde.');
  });

  it('erklärt Fehler verständlich', () => {
    expect(friendRequestMessage('self')).toBe('Das ist dein eigener Code.');
    expect(friendRequestMessage('not_found')).toContain('gibt es nicht');
  });

  it('unterscheidet Erfolg und Hinweis', () => {
    expect(isFriendRequestSuccess('requested')).toBe(true);
    expect(isFriendRequestSuccess('not_found')).toBe(false);
    expect(isFriendRequestSuccess('self')).toBe(false);
  });
});
