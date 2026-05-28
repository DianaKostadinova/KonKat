import { ApplicationConfig, APP_INITIALIZER, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHighlightOptions } from 'ngx-highlightjs';
import { routes } from './app.routes';
import { AuthService } from './shared/auth/auth.service';
import { firebaseTokenInterceptor } from './shared/auth/firebase-token.interceptor';
import { httpErrorInterceptor } from './shared/http/error.interceptor';

function initFirebase(auth: AuthService) {
  return () => auth.init();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([firebaseTokenInterceptor, httpErrorInterceptor])),
    {
      provide: APP_INITIALIZER,
      useFactory: initFirebase,
      deps: [AuthService],
      multi: true,
    },
    provideHighlightOptions({
      fullLibraryLoader: () => import('highlight.js'),
      themePath: 'node_modules/highlight.js/styles/github-dark.css',
    }),
  ],
};
