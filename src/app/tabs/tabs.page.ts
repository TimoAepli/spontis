import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { add, compassOutline, personOutline } from 'ionicons/icons';

/**
 * Tab-Leiste: Entdecken | (+) | Profil.
 * Der Plus-Knopf ist kein Tab, sondern öffnet das Erstellen-Formular als eigene Seite.
 */
@Component({
  selector: 'app-tabs',
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
  templateUrl: './tabs.page.html',
  styleUrl: './tabs.page.scss',
})
export class TabsPage {
  private readonly router = inject(Router);

  constructor() {
    addIcons({ add, compassOutline, personOutline });
  }

  openCreate(): void {
    this.router.navigateByUrl('/neu');
  }
}
