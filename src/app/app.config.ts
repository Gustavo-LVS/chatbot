import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';

import { routes } from './app.routes';
import { initializeIconLibrary } from './icon-library.config';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    {
      provide: 'ICON_LIBRARY_INITIALIZER',
      useFactory: (library: FaIconLibrary) => {
        initializeIconLibrary(library);
      },
      deps: [FaIconLibrary],
      multi: true
    }
  ]
};
