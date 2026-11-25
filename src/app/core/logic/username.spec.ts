import { firstNameError, normalizeUsername, usernameError } from './username';

describe('Benutzername', () => {
  it('wird klein geschrieben, Leerzeichen und Umlaute ersetzt', () => {
    expect(normalizeUsername('  Lea Müller ')).toBe('lea_mueller');
    expect(normalizeUsername('JÖRG')).toBe('joerg');
  });

  it('akzeptiert gültige Namen', () => {
    expect(usernameError('lea_sg')).toBeNull();
    expect(usernameError('max.muster99')).toBeNull();
    expect(usernameError('Lea SG')).toBeNull(); // wird zu lea_sg
  });

  it('lehnt zu kurze, zu lange und ungültige Namen ab', () => {
    expect(usernameError('')).toBe('Bitte wähle einen Benutzernamen.');
    expect(usernameError('ab')).toBe('Mindestens 3 Zeichen.');
    expect(usernameError('a'.repeat(21))).toBe('Höchstens 20 Zeichen.');
    expect(usernameError('lea!')).toBe('Nur Buchstaben a–z, Zahlen, Punkt und _.');
    expect(usernameError('rené')).toBe('Nur Buchstaben a–z, Zahlen, Punkt und _.');
  });
});

describe('Vorname', () => {
  it('muss ausgefüllt und höchstens 40 Zeichen lang sein', () => {
    expect(firstNameError('Lea')).toBeNull();
    expect(firstNameError('   ')).toBe('Bitte gib deinen Vornamen an.');
    expect(firstNameError('x'.repeat(41))).toBe('Höchstens 40 Zeichen.');
  });
});
