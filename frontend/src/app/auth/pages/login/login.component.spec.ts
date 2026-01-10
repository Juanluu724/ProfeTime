import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {

  correo: string = '';
  password: string = '';
  mensaje: string = '';
  mensajeTipo: string = '';

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  onLogin() {
    this.mensaje = '';
    this.mensajeTipo = '';

    this.http.post<any>('http://localhost:3000/api/auth/login', {
      correo: this.correo,
      password: this.password
    }).subscribe({
      next: (res) => {
        this.mensaje = 'Login correcto';
        this.mensajeTipo = 'success';

        // Navegar al dashboard
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.mensaje = 'Correo o contraseña incorrectos';
        this.mensajeTipo = 'error';
        console.error(err);
      }
    });
  }
}
