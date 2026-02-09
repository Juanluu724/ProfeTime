import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../../ui/toast.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  mensaje = '';
  mensajeTipo: 'success' | 'error' | '' = '';
  loading = false;
  private returnUrl = '/dashboard';

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private toast: ToastService,
    private destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.route.queryParams
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const returnUrlParam = params['returnUrl'];
        if (typeof returnUrlParam === 'string' && returnUrlParam.trim()) {
          this.returnUrl = returnUrlParam.trim();
        }

        const authPayload = params['auth'];
        if (typeof authPayload === 'string' && authPayload.trim()) {
          // Return from Google APIs linking flow (/api/auth/google/callback).
          try {
            const decoded = this.decodeBase64Json(authPayload.trim());
            this.authService.setUser(decoded);

            const linked = params['linked'] === '1';
            this.navigateAfterLogin({ linked });
          } catch {
            this.mensaje = 'No se pudo completar el enlace con Google.';
            this.mensajeTipo = 'error';
            this.toast.error(this.mensaje);
          }
          return;
        }

        // If the user is already logged in, take them to the intended route.
        if (this.authService.userValue) {
          this.navigateAfterLogin();
        }
      });
  }

  loginWithGoogle(): void {
    if (this.loading) return;
    this.mensaje = '';
    this.mensajeTipo = '';
    this.loading = true;

    this.authService
      .loginWithFirebaseGoogle()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          this.navigateAfterLogin();
        },
        error: (err) => {
          console.error(err);
          const msg = this.humanizeLoginError(err);
          this.mensaje = msg;
          this.mensajeTipo = 'error';
          this.toast.error(msg);
        }
      });
  }

  private navigateAfterLogin(extra?: { linked?: boolean }) {
    const target = this.sanitizeReturnUrl(this.returnUrl);
    const tree = this.router.parseUrl(target);
    if (extra?.linked) {
      tree.queryParams = { ...(tree.queryParams || {}), linked: '1' };
    }
    this.router.navigateByUrl(tree, { replaceUrl: true });
  }

  private sanitizeReturnUrl(url: string): string {
    const trimmed = String(url || '').trim();
    if (!trimmed) return '/dashboard';
    // Prevent open-redirects; only allow in-app absolute paths.
    if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return '/dashboard';
    if (trimmed.startsWith('/login')) return '/dashboard';
    return trimmed;
  }

  private decodeBase64Json(base64OrUrlSafe: string): any {
    let base64 = base64OrUrlSafe.replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4;
    if (pad) base64 += '='.repeat(4 - pad);

    // atob() returns a "binary string" (latin-1). Decode it as UTF-8.
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const json = new TextDecoder('utf-8').decode(bytes);
    return JSON.parse(json);
  }

  private humanizeLoginError(err: any): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 0) return 'No hay conexión. Revisa Internet y vuelve a intentarlo.';
      if (err.status === 403) return 'Tu cuenta no está autorizada para acceder a ProfeTime.';
      if (err.status >= 500) return 'Error del servidor. Inténtalo de nuevo en unos segundos.';
      return err.error?.msg || 'No se pudo iniciar sesión. Inténtalo de nuevo.';
    }

    const code = String(err?.code || '');
    if (code === 'auth/popup-closed-by-user') return 'Inicio de sesión cancelado.';
    if (code === 'auth/popup-blocked') return 'El navegador bloqueó la ventana emergente. Permite pop-ups y reintenta.';
    if (code === 'auth/network-request-failed') return 'No hay conexión. Revisa Internet y vuelve a intentarlo.';
    if (code === 'auth/unauthorized-domain') return 'Dominio no autorizado para Firebase (configuración).';

    return 'No se pudo iniciar sesión con Google.';
  }
}
