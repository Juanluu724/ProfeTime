import { Injectable } from '@angular/core';
import { CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { from, map, Observable } from 'rxjs';
import { AuthService } from './services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(_: any, state: RouterStateSnapshot): Observable<boolean | UrlTree> {
    return from(this.auth.isAuthenticated()).pipe(
      map((ok) =>
        ok
          ? true
          : this.router.createUrlTree(['/login'], {
              queryParams: { returnUrl: state.url }
            })
      )
    );
  }
}

