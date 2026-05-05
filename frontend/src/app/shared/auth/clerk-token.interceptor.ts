import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

/**
 * Functional HTTP interceptor that automatically attaches the Clerk
 * session token as a Bearer token to every outgoing API request.
 *
 * No service needs to manually set Authorization headers anymore.
 */
export const clerkTokenInterceptor: HttpInterceptorFn = (req, next) => {
  // Only inject for our own API — don't attach tokens to Clerk's own endpoints
  if (!req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }

  const auth = inject(AuthService);

  return from(auth.getToken()).pipe(
    switchMap(token => {
      if (!token) return next(req);
      return next(
        req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      );
    })
  );
};
