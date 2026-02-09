import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest
} from '@angular/common/http';
import { Observable, from, switchMap } from 'rxjs';
import { AuthService } from './services/auth.service';
import { environment } from '../../environments/environment';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // If the call already has auth, don't override it.
    if (req.headers.has('Authorization')) {
      return next.handle(req);
    }

    // Avoid leaking Firebase tokens to non-API requests (assets, 3rd parties, etc).
    const base = (environment.apiBaseUrl || '').replace(/\/+$/, '');
    const isApi =
      req.url.startsWith('/api/') ||
      req.url.startsWith('api/') ||
      (!!base && req.url.startsWith(base));
    if (!isApi) {
      return next.handle(req);
    }

    return from(this.authService.getIdToken()).pipe(
      switchMap((token) => {
        if (!token) {
          return next.handle(req);
        }
        return next.handle(
          req.clone({
            setHeaders: {
              Authorization: `Bearer ${token}`
            }
          })
        );
      })
    );
  }
}
