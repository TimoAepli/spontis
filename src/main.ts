// Muss zuerst geladen werden: wertet ?demo=1 / ?demo=0 aus, bevor die Datenquelle entsteht.
import './app/core/demo-mode';

import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
