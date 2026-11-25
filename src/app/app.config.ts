import {
  ApplicationConfig,
  isDevMode,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter, RouteReuseStrategy, withComponentInputBinding } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';

import { routes } from './app.routes';
import { DataSource } from './core/data/data-source';
import { DemoDataSource } from './core/data/demo-data-source';
import { SupabaseDataSource } from './core/data/supabase-data-source';
import { isDemoMode } from './core/demo-mode';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    // Einheitlicher iOS-Look auf allen Geräten, damit die Demo überall gleich aussieht.
    provideIonicAngular({ mode: 'ios' }),
    // Datenquelle: Demo-Modus (lokal, ohne Supabase) oder echte Daten. Wird einmal beim Start entschieden.
    {
      provide: DataSource,
      useFactory: () => (isDemoMode() ? new DemoDataSource() : new SupabaseDataSource()),
    },
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
