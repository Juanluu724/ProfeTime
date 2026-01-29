import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest
} from '@angular/common/http';
import { Observable, from, switchMap } from 'rxjs';
import { AuthService } from './services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
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

