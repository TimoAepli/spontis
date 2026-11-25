import { Injectable, inject } from '@angular/core';
import { ToastController } from '@ionic/angular/standalone';

export interface ShareContent {
  title: string;
  text: string;
  url: string;
}

/**
 * Teilen über das Teilen-Menü des Handys (Web Share API → WhatsApp, Telegram usw.).
 * Wo das nicht geht (z. B. am Laptop), wird der Link in die Zwischenablage kopiert.
 */
@Injectable({ providedIn: 'root' })
export class ShareService {
  private readonly toasts = inject(ToastController);

  /** Gibt zurück, ob geteilt bzw. kopiert wurde. */
  async share(content: ShareContent): Promise<boolean> {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share(content);
        return true;
      } catch (e) {
        // Abbrechen durch die Person ist kein Fehler
        if ((e as DOMException)?.name === 'AbortError') return false;
      }
    }
    return this.copy(`${content.text}\n${content.url}`, 'Link kopiert – jetzt im Gruppenchat einfügen.');
  }

  async copy(text: string, message = 'Kopiert.'): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      await this.toast(message);
      return true;
    } catch {
      await this.toast('Kopieren hat nicht geklappt.');
      return false;
    }
  }

  private async toast(message: string): Promise<void> {
    const t = await this.toasts.create({ message, duration: 2500, position: 'top' });
    await t.present();
  }
}

/** Absoluter Link innerhalb der App, z. B. appLink('/f/AB12CD'). */
export function appLink(path: string): string {
  return `${location.origin}${path}`;
}
