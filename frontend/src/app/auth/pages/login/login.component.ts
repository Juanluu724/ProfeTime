import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {

  correo: string = '';
  password: string = '';

  mensaje: string = '';
  mensajeTipo: 'success' | 'error' | '' = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const authPayload = params['auth'];
      if (!authPayload) {
        return;
      }

      try {
        const decoded = JSON.parse(atob(authPayload));
        localStorage.setItem("user", JSON.stringify(decoded));
        localStorage.setItem("profetime_user", JSON.stringify(decoded));
        this.router.navigate(['/dashboard']);
      } catch {
        this.mensaje = "No se pudo completar el inicio con Google.";
        this.mensajeTipo = "error";
      }
    });
  }

  onLogin() {
    this.mensaje = '';
    this.mensajeTipo = '';

    this.authService.login(this.correo, this.password).subscribe({
      next: (res) => {
        this.mensaje = "Usuario correcto";
        this.mensajeTipo = "success";

        localStorage.setItem("user", JSON.stringify(res.user));

        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 800);
      },
      error: () => {
        this.mensaje = "Correo o contraseña incorrectos";
        this.mensajeTipo = "error";
      }
    });
  }

  loginWithGoogle() {
    window.location.href = "http://localhost:3000/api/auth/google";
  }
}
