import { Routes } from '@angular/router';
import { requireNoProfile, requireProfile } from './core/auth.guard';

export const routes: Routes = [
  {
    path: 'willkommen',
    canActivate: [requireNoProfile],
    loadComponent: () => import('./auth/welcome.page').then((m) => m.WelcomePage),
  },
  {
    // Anmelden mit E-Mail und Passwort (ohne Routen-Schutz: auch Gäste können sich anmelden)
    path: 'login',
    loadComponent: () => import('./auth/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'tabs',
    canActivate: [requireProfile],
    loadComponent: () => import('./tabs/tabs.page').then((m) => m.TabsPage),
    children: [
      {
        path: 'entdecken',
        loadComponent: () => import('./discover/discover.page').then((m) => m.DiscoverPage),
      },
      {
        path: 'profil',
        loadComponent: () => import('./profile/profile.page').then((m) => m.ProfilePage),
      },
      { path: '', redirectTo: 'entdecken', pathMatch: 'full' },
    ],
  },
  {
    path: 'neu',
    canActivate: [requireProfile],
    loadComponent: () => import('./create/create.page').then((m) => m.CreatePage),
  },
  {
    // Ohne Routen-Schutz: Geteilte Links funktionieren auch ohne Konto (Beitritt als Gast)
    path: 'a/:id',
    loadComponent: () =>
      import('./activity/activity-detail.page').then((m) => m.ActivityDetailPage),
  },
  {
    path: 'f/:code',
    canActivate: [requireProfile],
    loadComponent: () => import('./invite/invite.page').then((m) => m.InvitePage),
  },
  {
    // Versteckte Testseite (nicht verlinkt): Messwerte der Tests mit der Zielgruppe
    path: 'test',
    loadComponent: () => import('./test/test.page').then((m) => m.TestPage),
  },
  { path: '', redirectTo: 'tabs/entdecken', pathMatch: 'full' },
  { path: '**', redirectTo: 'tabs/entdecken' },
];
