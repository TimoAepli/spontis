import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Nur mit vollem Konto (Benutzername). Ohne Konto oder als Gast → Registrierung,
 * danach zurück zur gewünschten Seite. Gäste dürfen nur Eventseiten (/a/:id) sehen.
 */
export const requireProfile: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.init();
  if (auth.isRegistered() && !auth.isGuest()) return true;
  return router.createUrlTree(['/willkommen'], { queryParams: { weiter: state.url } });
};

/** Registrierung nur ohne volles Konto (Gäste dürfen hier ihr Konto vervollständigen). */
export const requireNoProfile: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.init();
  return auth.isRegistered() && !auth.isGuest() ? router.createUrlTree(['/tabs/entdecken']) : true;
};
