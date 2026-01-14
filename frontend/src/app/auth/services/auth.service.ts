import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs'; // Importamos BehaviorSubject y tap

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = 'http://localhost:3000/api/auth/login';

  private userSubject = new BehaviorSubject<any>(this.getUserFromStorage());
  
  public user$ = this.userSubject.asObservable();

  constructor(private http: HttpClient) { }

  // Método auxiliar para recuperar del almacenamiento local sin errores
  private getUserFromStorage(): any {
    const userJson = localStorage.getItem('profetime_user');
    return userJson ? JSON.parse(userJson) : null;
  }

  login(correo: string, password: string): Observable<any> {
    return this.http.post(this.apiUrl, { correo, password }).pipe(
      tap((response: any) => {
        
        const userToSave = response.user || response.usuario || response;

        if (userToSave) {
          // a) Guardamos en el navegador (Persistencia)
          localStorage.setItem('profetime_user', JSON.stringify(userToSave));
          
          // b) Avisamos a toda la app de que hay un nuevo usuario (Estado)
          this.userSubject.next(userToSave);
        }
      })
    );
  }

  logout() {
    localStorage.removeItem('profetime_user');
    this.userSubject.next(null);
  }
}