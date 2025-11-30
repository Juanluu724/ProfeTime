import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {

  correo: string = '';
  password: string = '';

  mensaje: string = '';
  mensajeTipo: 'success' | 'error' | '' = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

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
}
