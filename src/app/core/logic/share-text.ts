import { CATEGORIES, Category } from '../models';
import { participation } from './participation';
import { formatTime } from './time';

export interface ShareableActivity {
  id: string;
  category: Category;
  title: string;
  startsAt: Date;
  placeName: string;
  participantCount: number;
  minParticipants: number;
  creatorInviteCode: string;
}

/**
 * Pfad zum Teilen: /a/<id>?f=<Code des Erstellers>.
 * Mit dem Code kann jemand, der (noch) kein Freund ist, direkt eine Anfrage senden.
 */
export function sharePath(a: Pick<ShareableActivity, 'id' | 'creatorInviteCode'>): string {
  return `/a/${a.id}?f=${encodeURIComponent(a.creatorInviteCode)}`;
}

/** Text für den Gruppenchat, z. B. «⚽ Volleyball – heute 18:00 @ Kreuzbleiche. 2/4 dabei, noch 2 fehlen. Wer kommt mit?» */
export function shareText(a: ShareableActivity): string {
  const p = participation(a.participantCount, a.minParticipants);
  const status = p.isHappening
    ? `${p.label} – findet statt!`
    : `${p.label}, ${p.missing === 1 ? 'noch 1 fehlt' : `noch ${p.missing} fehlen`}.`;
  return `${CATEGORIES[a.category].emoji} ${a.title} – heute ${formatTime(a.startsAt)} @ ${a.placeName}. ${status} Wer kommt mit?`;
}
