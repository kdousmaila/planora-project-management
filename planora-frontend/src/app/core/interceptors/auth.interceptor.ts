import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const token = authService.getToken();
  const authReq = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // ✅ CORRECTION : exclure /auth/login ET /auth/register pour ne jamais logout sur ces pages
      const isAuthEndpoint = req.url.includes('/auth/login') || req.url.includes('/auth/register');

      if (error.status === 401 && !isAuthEndpoint) {
        const refreshToken = authService.getRefreshToken();
        if (refreshToken) {
          return authService.refreshToken().pipe(
            switchMap(response => {
              if (response.success) {
                const newToken = authService.getToken();
                const retryReq = req.clone({ setHeaders: { Authorization: `Bearer ${newToken}` } });
                return next(retryReq);
              }
              authService.logout();
              return throwError(() => error);
            }),
            catchError(() => {
              authService.logout();
              return throwError(() => error);
            })
          );
        }
        authService.logout();
      }

      // ✅ Dans tous les cas, l'erreur remonte au composant (login.component l'affiche)
      return throwError(() => error);
    })
  );
};
