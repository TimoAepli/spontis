import { distanceKm, NEARBY_RADIUS_KM, ST_GALLEN } from '../logic/geo';
import { participation } from '../logic/participation';
import { DemoDataSource } from './demo-data-source';
import { buildDemoSeed, DEMO_ME } from './demo-seed';

describe('Demo-Modus: Beispieldaten', () => {
  const now = new Date('2026-12-14T09:00:00Z');
  const seed = buildDemoSeed(now);

  it('alle IDs sind als Demo erkennbar (nie mit echten Daten verwechselbar)', () => {
    for (const a of seed.activities) {
      expect(a.id.startsWith('demo-')).toBe(true);
      expect(a.creatorId.startsWith('demo-')).toBe(true);
      a.participants.forEach((p) => expect(p.userId.startsWith('demo-')).toBe(true));
    }
    seed.friends.forEach((f) => expect(f.userId.startsWith('demo-')).toBe(true));
  });

  it('alle Treffpunkte liegen rund um St. Gallen', () => {
    for (const a of seed.activities) {
      expect(distanceKm(ST_GALLEN, a)).toBeLessThan(NEARBY_RADIUS_KM);
    }
  });

  it('zeigt eine gute Mischung für die Vorführung', () => {
    const states = seed.activities.map((a) => participation(a.participants.length, a.minParticipants));
    expect(seed.activities.length).toBeGreaterThanOrEqual(6);
    expect(states.some((p) => p.isHappening)).toBe(true); // mind. eine «Findet statt»
    expect(states.some((p) => p.missing === 1)).toBe(true); // mind. eine, wo noch 1 fehlt
    expect(new Set(seed.activities.map((a) => a.visibility)).size).toBe(2);
    expect(new Set(seed.activities.map((a) => a.category)).size).toBe(5);
  });

  it('alle Aktivitäten starten in der Zukunft', () => {
    seed.activities.forEach((a) => expect(a.startsAt.getTime()).toBeGreaterThan(now.getTime()));
  });
});

describe('Demo-Modus: simulierte Zusagen', () => {
  let demo: DemoDataSource;

  beforeEach(() => {
    vi.useFakeTimers();
    demo = new DemoDataSource({ latencyMs: 0, firstJoinMs: 4000, nextJoinMs: 4000 });
  });

  afterEach(() => {
    demo.dispose();
    vi.useRealTimers();
  });

  it('neue Aktivität füllt sich, bis «Findet statt» erreicht ist', async () => {
    const changes: (string | null)[] = [];
    demo.watch((id) => changes.push(id));

    const id = await demo.createActivity({
      category: 'sport',
      title: 'Pingpong',
      startsAt: new Date(Date.now() + 3600e3),
      lat: 47.42,
      lng: 9.37,
      placeName: 'Drei Weieren',
      minParticipants: 3,
      visibility: 'nearby',
    });

    let a = (await demo.getActivity(id))!;
    expect(a.participantCount).toBe(1);
    expect(a.isJoined).toBe(true);
    expect(a.creatorId).toBe(DEMO_ME.id);

    vi.advanceTimersByTime(4000);
    a = (await demo.getActivity(id))!;
    expect(a.participantCount).toBe(2);

    vi.advanceTimersByTime(4000);
    a = (await demo.getActivity(id))!;
    expect(a.participantCount).toBe(3);

    // danach kommen keine weiteren mehr
    vi.advanceTimersByTime(20000);
    expect((await demo.getActivity(id))!.participantCount).toBe(3);
    expect(changes.filter((c) => c === id).length).toBe(3); // erstellt + 2 Zusagen
  });

  it('Beitreten: Aktivität füllt sich danach bis «Findet statt»', async () => {
    const before = (await demo.getActivity('demo-volleyball'))!;
    expect(before.participantCount).toBe(4); // 4/6

    await demo.join('demo-volleyball');
    expect((await demo.getActivity('demo-volleyball'))!.participantCount).toBe(5);

    vi.advanceTimersByTime(4000);
    const after = (await demo.getActivity('demo-volleyball'))!;
    expect(participation(after.participantCount, after.minParticipants).isHappening).toBe(true);
  });

  it('Austreten entfernt mich, ohne andere zu entfernen', async () => {
    await demo.join('demo-joggen');
    await demo.leave('demo-joggen');
    const a = (await demo.getActivity('demo-joggen'))!;
    expect(a.isJoined).toBe(false);
    expect(a.participantCount).toBe(1);
  });

  it('Freundschaftsanfrage annehmen', async () => {
    const pending = (await demo.listFriends()).find((f) => f.status === 'pending')!;
    await demo.acceptFriend(pending.userId);
    expect((await demo.listFriends()).every((f) => f.status === 'accepted')).toBe(true);
    expect(await demo.requestFriend(DEMO_ME.invite_code)).toBe('self');
  });
});
