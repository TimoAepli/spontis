import { ActivityDraft, clampParticipants, validateDraft } from './activity-draft';

describe('Erstellen-Formular', () => {
  const now = new Date('2026-11-25T16:00:00Z'); // 17:00 Zürich
  const valid: ActivityDraft = {
    category: 'sport',
    title: 'Volleyball',
    time: '18:00',
    lat: 47.42,
    lng: 9.37,
    placeName: 'Kreuzbleiche',
    minParticipants: 4,
    visibility: 'nearby',
  };

  it('akzeptiert ein vollständiges Formular', () => {
    expect(validateDraft(valid, now)).toEqual({});
  });

  it('verlangt Kategorie, Titel, Zeit und Treffpunkt', () => {
    const errors = validateDraft(
      { ...valid, category: null, title: ' ', time: '', lat: null, lng: null },
      now,
    );
    expect(Object.keys(errors).sort()).toEqual(['category', 'place', 'time', 'title']);
  });

  it('lehnt vergangene Zeiten ab, erlaubt aber 5 Minuten Toleranz', () => {
    expect(validateDraft({ ...valid, time: '16:30' }, now).time).toBe('Diese Zeit ist schon vorbei.');
    expect(validateDraft({ ...valid, time: '16:56' }, now).time).toBeUndefined();
  });

  it('verlangt einen Namen für den Treffpunkt', () => {
    expect(validateDraft({ ...valid, placeName: '' }, now).place).toBe('Gib dem Treffpunkt einen Namen.');
  });

  it('Mindestanzahl 2–10 (inkl. Ersteller)', () => {
    expect(validateDraft({ ...valid, minParticipants: 1 }, now).minParticipants).toBeDefined();
    expect(validateDraft({ ...valid, minParticipants: 11 }, now).minParticipants).toBeDefined();
    expect(validateDraft({ ...valid, minParticipants: 10 }, now).minParticipants).toBeUndefined();
    expect(clampParticipants(1)).toBe(2);
    expect(clampParticipants(12)).toBe(10);
    expect(clampParticipants(5)).toBe(5);
  });

  it('Titel höchstens 60 Zeichen', () => {
    expect(validateDraft({ ...valid, title: 'x'.repeat(61) }, now).title).toBe('Höchstens 60 Zeichen.');
  });
});
