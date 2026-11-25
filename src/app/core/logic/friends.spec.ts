import { friendRequestMessage, isFriendRequestSuccess, isValidInviteCode, normalizeInviteCode } from './friends';

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
