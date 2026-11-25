import { FriendRequestResult } from '../logic/friends';
import { Activity, Category, Friend, Participant, Visibility } from '../models';

/** Daten für eine neue Aktivität (Ersteller setzt die Datenbank selbst). */
export interface NewActivity {
  category: Category;
  title: string;
  startsAt: Date;
  lat: number;
  lng: number;
  placeName: string;
  minParticipants: number;
  visibility: Visibility;
}

/**
 * Einzige Schnittstelle, über die Seiten Daten lesen und schreiben.
 * Umsetzungen: SupabaseDataSource (echt) und später DemoDataSource (lokal, Demo-Modus).
 * Welche verwendet wird, entscheidet sich einmal beim Start (siehe app.config.ts).
 */
export abstract class DataSource {
  /** Alle für mich sichtbaren Aktivitäten von heute (Filter «heute» und «Nur Freunde» macht die Datenbank). */
  abstract listToday(): Promise<Activity[]>;

  /** Eine Aktivität oder null, wenn sie nicht (mehr) sichtbar ist. */
  abstract getActivity(id: string): Promise<Activity | null>;

  /** Zugesagte Personen, in der Reihenfolge der Zusage. */
  abstract listParticipants(activityId: string): Promise<Participant[]>;

  /** Erstellt eine Aktivität; der Ersteller ist automatisch dabei. Gibt die neue ID zurück. */
  abstract createActivity(input: NewActivity): Promise<string>;

  abstract join(activityId: string): Promise<void>;
  abstract leave(activityId: string): Promise<void>;
  abstract deleteActivity(activityId: string): Promise<void>;

  /** Freunde, offene Anfragen an mich und von mir. */
  abstract listFriends(): Promise<Friend[]>;
  /** Vorname zu einem Einladungscode (für «Anfrage an Lea gesendet»), oder null. */
  abstract nameForInviteCode(code: string): Promise<string | null>;
  abstract requestFriend(code: string): Promise<FriendRequestResult>;
  abstract acceptFriend(userId: string): Promise<void>;
  /** Freundschaft beenden, Anfrage ablehnen oder zurückziehen. */
  abstract removeFriend(userId: string): Promise<void>;

  /**
   * Echtzeit: ruft `onChange` auf, sobald jemand beitritt, austritt oder eine Aktivität
   * erstellt bzw. gelöscht wird. `activityId` ist null, wenn unklar ist, welche betroffen ist.
   * Gibt eine Funktion zum Abmelden zurück.
   */
  abstract watch(onChange: (activityId: string | null) => void): () => void;
}
