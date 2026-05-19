import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../toast/toast.service';

/**
 * Surface HTTP failures to the user via toast. Component-level error handlers
 * still fire because we rethrow — this only adds a user-visible notification
 * so silent network errors aren't swallowed.
 *
 * 401 is intentionally skipped: the auth guard handles unauthenticated redirects.
 */
export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);
  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status !== 401 && err.status !== 0) {
        const msg = extractMessage(err) || `Request failed (${err.status || 'network'})`;
        toast.error(msg);
      } else if (err.status === 0) {
        toast.error('Network error — check your connection');
      }
      return throwError(() => err);
    }),
  );
};

function extractMessage(err: HttpErrorResponse): string | null {
  const body = err.error;
  if (typeof body === 'string') return body;
  if (body && typeof body === 'object') {
    return body.message || body.error || body.detail || null;
  }
  return null;
}
