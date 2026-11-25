import { FriendRequestResult } from '../logic/friends';
import { Activity, Friend, Participant } from '../models';
import { DataSource, NewActivity } from './data-source';
import { buildDemoSeed, DEMO_JOIN_ORDER, DEMO_ME, DEMO_PEOPLE, DemoActivity } from './demo-seed';

export interface DemoOptions {
  /** Künstliche Wartezeit pro Anfrage, damit es sich echt anfühlt (Tests: 0). */
  latencyMs?: number;
  /** Erste simulierte Zusage nach so vielen ms … */
  firstJoinMs?: number;
  /** … danach je eine weitere nach so vielen ms. */
  nextJoinMs?: number;
  now?: Date;
}

/**
 * Datenquelle für den Demo-Modus: alles im Arbeitsspeicher, kein Netzwerk, kein Supabase.
 *
 * Drehbuch für die Pitch-Demo:
 * - Wer eine Aktivität erstellt, bekommt nach ca. 4 s die erste simulierte Zusage,
 *   danach alle 4 s eine weitere, bis «Findet statt» erreicht ist.
 * - Wer einer Aktivität beitritt, die noch nicht stattfindet, sieht kurz danach
 *   weitere Zusagen, bis sie stattfindet.
 */
export class DemoDataSource extends DataSource {
  private readonly activities: DemoActivity[];
  private readonly friends: Friend[];
  private readonly listeners = new Set<(id: string | null) => void>();
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();
  private readonly latencyMs: number;
  private readonly firstJoinMs: number;
  private readonly nextJoinMs: number;
  private counter = 0;

  constructor(options: DemoOptions = {}) {
    super();
    const seed = buildDemoSeed(options.now ?? new Date());
    this.activities = seed.activities;
    this.friends = seed.friends;
    this.latencyMs = options.latencyMs ?? 150;
    this.firstJoinMs = options.firstJoinMs ?? 4000;
    this.nextJoinMs = options.nextJoinMs ?? 4000;
  }

  // ---------- Lesen ----------

  async listToday(): Promise<Activity[]> {
    await this.delay();
    return [...this.activities]
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
      .map((a) => this.toActivity(a));
  }

  async getActivity(id: string): Promise<Activity | null> {
    await this.delay();
    const a = this.find(id);
    return a ? this.toActivity(a) : null;
  }

  async listParticipants(activityId: string): Promise<Participant[]> {
    await this.delay();
    return [...(this.find(activityId)?.participants ?? [])];
  }

  // ---------- Schreiben ----------

  async createActivity(input: NewActivity): Promise<string> {
    await this.delay();
    const id = `demo-new-${++this.counter}`;
    this.activities.push({
      id,
      creatorId: DEMO_ME.id,
      creatorFirstName: DEMO_ME.first_name,
      creatorInviteCode: DEMO_ME.invite_code,
      category: input.category,
      title: input.title.trim(),
      startsAt: input.startsAt,
      lat: input.lat,
      lng: input.lng,
      placeName: input.placeName.trim(),
      minParticipants: input.minParticipants,
      visibility: input.visibility,
      isSponsored: false,
      participants: [{ userId: DEMO_ME.id, firstName: DEMO_ME.first_name, joinedAt: new Date() }],
    });
    this.emit(id);
    this.fillUntilHappening(id);
    return id;
  }

  async join(activityId: string): Promise<void> {
    await this.delay();
    const a = this.find(activityId);
    if (!a || a.participants.some((p) => p.userId === DEMO_ME.id)) return;
    a.participants.push({ userId: DEMO_ME.id, firstName: DEMO_ME.first_name, joinedAt: new Date() });
    this.emit(activityId);
    this.fillUntilHappening(activityId);
  }

  async leave(activityId: string): Promise<void> {
    await this.delay();
    const a = this.find(activityId);
    if (!a) return;
    a.participants = a.participants.filter((p) => p.userId !== DEMO_ME.id);
    this.emit(activityId);
  }

  async deleteActivity(activityId: string): Promise<void> {
    await this.delay();
    const index = this.activities.findIndex((a) => a.id === activityId && a.creatorId === DEMO_ME.id);
    if (index >= 0) this.activities.splice(index, 1);
    this.emit(activityId);
  }

  // ---------- Freunde ----------

  async listFriends(): Promise<Friend[]> {
    await this.delay();
    return this.friends.map((f) => ({ ...f }));
  }

  async nameForInviteCode(code: string): Promise<string | null> {
    if (code === DEMO_ME.invite_code) return DEMO_ME.first_name;
    return Object.values(DEMO_PEOPLE).find((p) => p.code === code)?.firstName ?? 'Max';
  }

  async requestFriend(code: string): Promise<FriendRequestResult> {
    await this.delay();
    if (code === DEMO_ME.invite_code) return 'self';
    const person = Object.values(DEMO_PEOPLE).find((p) => p.code === code);
    const userId = person?.id ?? `demo-code-${code}`;
    const existing = this.friends.find((f) => f.userId === userId);
    if (existing?.status === 'accepted') return 'already_friends';
    if (existing?.direction === 'incoming') {
      existing.status = 'accepted';
      return 'accepted';
    }
    if (existing) return 'pending';
    this.friends.push({
      userId,
      firstName: person?.firstName ?? 'Max',
      username: person?.username ?? 'max_sg',
      status: 'pending',
      direction: 'outgoing',
    });
    return 'requested';
  }

  async acceptFriend(userId: string): Promise<void> {
    await this.delay();
    const f = this.friends.find((x) => x.userId === userId && x.direction === 'incoming');
    if (f) f.status = 'accepted';
  }

  async removeFriend(userId: string): Promise<void> {
    await this.delay();
    const index = this.friends.findIndex((f) => f.userId === userId);
    if (index >= 0) this.friends.splice(index, 1);
  }

  // ---------- Echtzeit (simuliert) ----------

  watch(onChange: (activityId: string | null) => void): () => void {
    this.listeners.add(onChange);
    return () => this.listeners.delete(onChange);
  }

  /** Stoppt alle simulierten Zusagen (für Tests). */
  dispose(): void {
    this.timers.forEach((t) => clearTimeout(t));
    this.timers.clear();
    this.listeners.clear();
  }

  // ---------- intern ----------

  private find(id: string): DemoActivity | undefined {
    return this.activities.find((a) => a.id === id);
  }

  private toActivity(a: DemoActivity): Activity {
    const { participants, ...rest } = a;
    return {
      ...rest,
      participantCount: participants.length,
      isJoined: participants.some((p) => p.userId === DEMO_ME.id),
    };
  }

  private emit(id: string | null): void {
    this.listeners.forEach((l) => l(id));
  }

  private delay(): Promise<void> {
    return this.latencyMs > 0 ? new Promise((r) => setTimeout(r, this.latencyMs)) : Promise.resolve();
  }

  /** Simulierte Personen treten nacheinander bei, bis die Mindestanzahl erreicht ist. */
  private fillUntilHappening(activityId: string): void {
    const step = (delay: number) => {
      const timer = setTimeout(() => {
        this.timers.delete(timer);
        const a = this.find(activityId);
        if (!a || a.participants.length >= a.minParticipants) return;
        const next = DEMO_JOIN_ORDER.map((k) => DEMO_PEOPLE[k]).find(
          (p) => !a.participants.some((x) => x.userId === p.id),
        );
        if (!next) return;
        a.participants.push({ userId: next.id, firstName: next.firstName, joinedAt: new Date() });
        this.emit(activityId);
        if (a.participants.length < a.minParticipants) step(this.nextJoinMs);
      }, delay);
      this.timers.add(timer);
    };
    step(this.firstJoinMs);
  }
}
