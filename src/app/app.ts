import { Component, inject } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { filter } from 'rxjs';
import { isDemoMode } from './core/demo-mode';

@Component({
  selector: 'app-root',
  imports: [IonApp, IonRouterOutlet],
  templateUrl: './app.html',
  styles: `
    /* Gut sichtbare Markierung: Hier sind nur Beispieldaten zu sehen. */
    .demo-badge {
      position: fixed;
      z-index: 99999;
      left: 10px;
      bottom: calc(78px + env(safe-area-inset-bottom));
      padding: 4px 10px;
      border-radius: 999px;
      background: #ffc832;
      color: #1d1d1b;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.5px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      pointer-events: none;
    }
  `,
})
export class App {
  readonly demo = isDemoMode();

  constructor() {
    // Neue Version veröffentlicht? Sofort neu laden, damit Testpersonen immer den aktuellen Stand sehen.
    // (Der Service Worker speichert die App sonst bis zum übernächsten Öffnen.)
    const updates = inject(SwUpdate);
    if (updates.isEnabled) {
      updates.versionUpdates
        .pipe(filter((e): e is VersionReadyEvent => e.type === 'VERSION_READY'))
        .subscribe(() => document.location.reload());
    }
  }
}
