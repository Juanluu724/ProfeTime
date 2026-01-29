import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  mensaje = '';
  mensajeTipo: 'success' | 'error' | '' = '';
  loading = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      const authPayload = params['auth'];
      if (!authPayload) return;

      // Return from Google APIs linking flow (/api/auth/google/callback).
      try {
        const decoded = JSON.parse(atob(authPayload));
        localStorage.setItem('profetime_user', JSON.stringify(decoded));
        localStorage.setItem('user', JSON.stringify(decoded));
        this.mensaje = 'Cuenta de Google vinculada correctamente.';
        this.mensajeTipo = 'success';
        this.router.navigate(['/dashboard']);
      } catch {
        this.mensaje = 'No se pudo completar el enlace con Google.';
        this.mensajeTipo = 'error';
      }
    });
  }

  loginWithGoogle(): void {
    this.mensaje = '';
    this.mensajeTipo = '';
    this.loading = true;

    this.authService.loginWithFirebaseGoogle().subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
        this.mensaje = 'No se pudo iniciar sesión con Google.';
        this.mensajeTipo = 'error';
      }
    });
  }
}

