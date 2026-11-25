import { Component, OnInit, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IonButton, IonContent, IonSpinner } from '@ionic/angular/standalone';
import { DataSource } from '../core/data/data-source';
import {
  FriendRequestResult,
  friendRequestMessage,
  isFriendRequestSuccess,
  isValidInviteCode,
  normalizeInviteCode,
} from '../core/logic/friends';

/**
 * Einladungslink /f/:code – sendet automatisch eine Freundschaftsanfrage.
 * Ohne Konto leitet der Routen-Schutz zuerst zur Registrierung und kommt danach hierher zurück.
 */
@Component({
  selector: 'app-invite',
  imports: [IonContent, IonButton, IonSpinner],
  template: `
    <ion-content class="ion-padding">
      <div class="box">
        @if (busy()) {
          <ion-spinner name="crescent" />
        } @else {
          <div class="icon" aria-hidden="true">{{ ok() ? '🤝' : '🤔' }}</div>
          <p class="text" role="status">{{ text() }}</p>
          <ion-button expand="block" size="large" (click)="goOn()">Weiter zu spontis</ion-button>
        }
      </div>
    </ion-content>
  `,
  styles: `
    .box { max-width: 420px; margin: 20vh auto 0; text-align: center; }
    .icon { font-size: 64px; margin-bottom: 12px; }
    .text { font-size: 18px; line-height: 1.4; margin: 0 0 28px; }
  `,
})
export class InvitePage implements OnInit {
  private readonly data = inject(DataSource);
  private readonly router = inject(Router);

  readonly code = input.required<string>();
  readonly busy = signal(true);
  readonly text = signal('');
  readonly ok = signal(false);
  private result: FriendRequestResult | null = null;

  async ngOnInit(): Promise<void> {
    const code = normalizeInviteCode(this.code());
    if (!isValidInviteCode(code)) {
      this.text.set(friendRequestMessage('not_found'));
      this.busy.set(false);
      return;
    }
    try {
      const [result, name] = await Promise.all([this.data.requestFriend(code), this.data.nameForInviteCode(code)]);
      this.result = result;
      this.text.set(friendRequestMessage(result, name ?? undefined));
      this.ok.set(isFriendRequestSuccess(result));
    } catch (e) {
      console.error(e);
      this.text.set('Das hat nicht geklappt. Prüfe die Internetverbindung und öffne den Link nochmals.');
    } finally {
      this.busy.set(false);
    }
  }

  goOn(): void {
    // Bei eigenem Code direkt zum Profil, sonst zu den Aktivitäten
    const target = this.result === 'self' ? '/tabs/profil' : '/tabs/entdecken';
    void this.router.navigateByUrl(target, { replaceUrl: true });
  }
}
