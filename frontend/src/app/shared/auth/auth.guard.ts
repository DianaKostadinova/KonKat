import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) return router.createUrlTree(['/sign-in']);

  // Profile setup is always accessible to logged-in users regardless of username
  if (route.routeConfig?.path === 'profile/edit') return true;

  // Redirect to profile setup if the user hasn't chosen a username yet
  const user = auth.user();
  if (user?.dbId != null && !user.username) {
    return router.createUrlTree(['/profile/edit'], { queryParams: { setup: 'true' } });
  }

  return true;
};
