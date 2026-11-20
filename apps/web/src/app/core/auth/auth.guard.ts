import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** A UI convenience only; Java always enforces authorization independently. */
export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.ensureReady();
  if (auth.user()) return true;
  const next = state.url.startsWith('/') && !state.url.startsWith('//') ? state.url : '/library';
  return router.createUrlTree(['/auth'], { queryParams: { returnUrl: next } });
};
