import { sharePath, shareText, ShareableActivity } from './share-text';

describe('Teilen', () => {
  const a: ShareableActivity = {
    id: 'abc-123',
    category: 'sport',
    title: 'Volleyball',
    startsAt: new Date('2026-11-25T17:00:00Z'), // 18:00 Zürich
    placeName: 'Kreuzbleiche',
    participantCount: 2,
    minParticipants: 4,
    creatorInviteCode: 'F27FA5',
  };

  it('Link öffnet die Aktivität und enthält den Code des Erstellers', () => {
    expect(sharePath(a)).toBe('/a/abc-123?f=F27FA5');
  });

  it('Text nennt Zeit, Ort und wie viele noch fehlen', () => {
    expect(shareText(a)).toBe('⚽ Volleyball – heute 18:00 @ Kreuzbleiche. 2/4 dabei, noch 2 fehlen. Wer kommt mit?');
  });

  it('Einzahl bei einer fehlenden Person', () => {
    expect(shareText({ ...a, participantCount: 3 })).toContain('noch 1 fehlt');
  });

  it('meldet, wenn es schon stattfindet', () => {
    expect(shareText({ ...a, participantCount: 4 })).toContain('4/4 dabei – findet statt!');
  });
});
