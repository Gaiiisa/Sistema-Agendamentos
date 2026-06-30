/* Interceptor HTTP — anexa o token JWT (Authorization: Bearer) em toda chamada. */
import { HttpInterceptorFn } from '@angular/common/http';

export const TOKEN_KEY = 'auth-token';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
  return next(req);
};
