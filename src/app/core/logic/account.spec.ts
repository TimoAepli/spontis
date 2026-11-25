import { emailError, passwordError } from './account';

describe('Konto sichern: E-Mail', () => {
  it('akzeptiert gültige Adressen', () => {
    expect(emailError('lea@example.ch')).toBeNull();
    expect(emailError('  lea.muster@gbs.sg.ch ')).toBeNull();
  });

  it('lehnt leere und ungültige Adressen ab', () => {
    expect(emailError('')).toBe('Bitte gib deine E-Mail-Adresse an.');
    expect(emailError('lea')).toBe('Das sieht nicht nach einer E-Mail-Adresse aus.');
    expect(emailError('lea@example')).toBe('Das sieht nicht nach einer E-Mail-Adresse aus.');
  });
});

describe('Konto sichern: Passwort', () => {
  it('verlangt mindestens 8 Zeichen', () => {
    expect(passwordError('')).toBe('Bitte gib ein Passwort ein.');
    expect(passwordError('kurz')).toBe('Mindestens 8 Zeichen.');
    expect(passwordError('lang genug')).toBeNull();
  });
});
