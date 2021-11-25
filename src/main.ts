import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import * as Sentry from '@sentry/angular';
import { Integrations } from '@sentry/tracing';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}

Sentry.init({
  dsn: environment.sentryDSN,
  environment: environment.envName,
  integrations: [
    new Integrations.BrowserTracing({
      tracingOrigins: [environment.sentryOrigin],
      routingInstrumentation: Sentry.routingInstrumentation,
    }),
  ],

  tracesSampleRate: 1.0,
});

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));
