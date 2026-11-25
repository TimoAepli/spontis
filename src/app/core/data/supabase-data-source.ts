import { Injectable } from '@angular/core';
import { FriendRequestResult } from '../logic/friends';
import { Activity, Category, Friend, Participant, Visibility } from '../models';
import { supabase } from '../supabase';
import { DataSource, NewActivity } from './data-source';

/** Zeile aus der View `activity_feed`. */
interface FeedRow {
  id: string;
  creator_id: string;
  creator_first_name: string;
  creator_invite_code: string;
  category: Category;
  title: string;
  starts_at: string;
  lat: number;
  lng: number;
  place_name: string;
  min_participants: number;
  visibility: Visibility;
  is_sponsored: boolean;
  participant_count: number;
  is_joined: boolean;
}

export function toActivity(row: FeedRow): Activity {
  return {
    id: row.id,
    creatorId: row.creator_id,
    creatorFirstName: row.creator_first_name,
    creatorInviteCode: row.creator_invite_code,
    category: row.category,
    title: row.title,
    startsAt: new Date(row.starts_at),
    lat: row.lat,
    lng: row.lng,
    placeName: row.place_name,
    minParticipants: row.min_participants,
    visibility: row.visibility,
    isSponsored: row.is_sponsored,
    participantCount: row.participant_count,
    isJoined: row.is_joined,
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class SupabaseDataSource extends DataSource {
  async listToday(): Promise<Activity[]> {
    const { data, error } = await supabase
      .from('activity_feed')
      .select('*')
      .order('starts_at', { ascending: true });
    if (error) throw error;
    return (data as FeedRow[]).map(toActivity);
  }

  /**
   * Detail über den Link-Zugriff (Funktion activity_by_link): funktioniert auch bei
   * «Nur Freunde» ohne Freundschaft und ohne Konto – wer die ID hat, hat den Link.
   */
  async getActivity(id: string): Promise<Activity | null> {
    if (!UUID.test(id)) return null; // ungültiger Link
    const { data, error } = await supabase.rpc('activity_by_link', { p_id: id });
    if (error) throw error;
    const rows = data as FeedRow[];
    return rows.length > 0 ? toActivity(rows[0]) : null;
  }

  async listParticipants(activityId: string): Promise<Participant[]> {
    if (!UUID.test(activityId)) return [];
    const { data, error } = await supabase.rpc('participants_by_link', { p_id: activityId });
    if (error) throw error;
    type Row = { user_id: string; first_name: string; joined_at: string };
    return (data as Row[]).map((r) => ({
      userId: r.user_id,
      firstName: r.first_name,
      joinedAt: new Date(r.joined_at),
    }));
  }

  async createActivity(input: NewActivity): Promise<string> {
    const { data, error } = await supabase
      .from('activities')
      .insert({
        category: input.category,
        title: input.title.trim(),
        starts_at: input.startsAt.toISOString(),
        lat: input.lat,
        lng: input.lng,
        place_name: input.placeName.trim(),
        min_participants: input.minParticipants,
        visibility: input.visibility,
      })
      .select('id')
      .single();
    if (error) throw error;
    return data.id as string;
  }

  async join(activityId: string): Promise<void> {
    const { error } = await supabase.from('participants').insert({ activity_id: activityId });
    // 23505 = schon dabei (z. B. doppelt getippt) → kein Fehler
    if (error && error.code !== '23505') throw error;
  }

  async leave(activityId: string): Promise<void> {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) return;
    const { error } = await supabase
      .from('participants')
      .delete()
      .eq('activity_id', activityId)
      .eq('user_id', userId);
    if (error) throw error;
  }

  async deleteActivity(activityId: string): Promise<void> {
    const { error } = await supabase.from('activities').delete().eq('id', activityId);
    if (error) throw error;
  }

  private async myId(): Promise<string | null> {
    const { data } = await supabase.auth.getSession();
    return data.session?.user.id ?? null;
  }

  async listFriends(): Promise<Friend[]> {
    const me = await this.myId();
    if (!me) return [];
    const { data, error } = await supabase
      .from('friendships')
      .select(
        'user_id, friend_id, status, ' +
          'requester:profiles!friendships_user_id_fkey(first_name, username), ' +
          'addressee:profiles!friendships_friend_id_fkey(first_name, username)',
      );
    if (error) throw error;
    type P = { first_name: string; username: string } | null;
    type Row = { user_id: string; friend_id: string; status: 'pending' | 'accepted'; requester: P; addressee: P };
    return (data as unknown as Row[]).map((r) => {
      const incoming = r.friend_id === me;
      const other = incoming ? r.requester : r.addressee;
      return {
        userId: incoming ? r.user_id : r.friend_id,
        firstName: other?.first_name ?? '?',
        username: other?.username ?? '', // Gäste haben keinen Benutzernamen
        status: r.status,
        direction: incoming ? 'incoming' : 'outgoing',
      };
    });
  }

  async nameForInviteCode(code: string): Promise<string | null> {
    const { data } = await supabase.from('profiles').select('first_name').eq('invite_code', code).maybeSingle();
    return data?.first_name ?? null;
  }

  async requestFriend(code: string): Promise<FriendRequestResult> {
    const { data, error } = await supabase.rpc('request_friend', { code });
    if (error) throw error;
    return data as FriendRequestResult;
  }

  async acceptFriend(userId: string): Promise<void> {
    const me = await this.myId();
    const { error } = await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('user_id', userId)
      .eq('friend_id', me);
    if (error) throw error;
  }

  async removeFriend(userId: string): Promise<void> {
    const me = await this.myId();
    const { error } = await supabase
      .from('friendships')
      .delete()
      .or(`and(user_id.eq.${me},friend_id.eq.${userId}),and(user_id.eq.${userId},friend_id.eq.${me})`);
    if (error) throw error;
  }

  watch(onChange: (activityId: string | null) => void): () => void {
    type Payload = { new?: Record<string, unknown>; old?: Record<string, unknown> };
    const idOf = (p: Payload, key: string) =>
      ((p.new?.[key] ?? p.old?.[key]) as string | undefined) ?? null;

    // Supabase prüft für jede Änderung die RLS-Policies: Man erhält nur, was man sehen darf.
    const channel = supabase
      .channel(`spontis-${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants' }, (p: Payload) =>
        onChange(idOf(p, 'activity_id')),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activities' }, (p: Payload) =>
        onChange(idOf(p, 'id')),
      )
      .subscribe();

    return () => void supabase.removeChannel(channel);
  }
}
