import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Nur mit Profil: sonst zur Willkommen-Seite, danach zurück zur gewünschten Seite (z. B. geteilter Link). */
export const requireProfile: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.init();
  if (auth.isRegistered()) return true;
  return router.createUrlTree(['/willkommen'], { queryParams: { weiter: state.url } });
};

/** Willkommen-Seite nur ohne Profil. */
export const requireNoProfile: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.init();
  return auth.isRegistered() ? router.createUrlTree(['/tabs/entdecken']) : true;
};
