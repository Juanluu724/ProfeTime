import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, from, switchMap, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import { Auth, GoogleAuthProvider, getAuth, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';

const USER_STORAGE_KEY = 'profetime_user';
const LEGACY_USER_STORAGE_KEY = 'user';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiBaseUrl}/api/auth/login`;
  private linkGoogleUrl = `${environment.apiBaseUrl}/api/auth/google`;

  private userSubject = new BehaviorSubject<any>(this.getUserFromStorage());
  public user$ = this.userSubject.asObservable();

  private firebaseApp: FirebaseApp;
  private auth: Auth;
  private authReady: Promise<void>;

  constructor(private http: HttpClient) {
    this.firebaseApp = this.initFirebaseApp();
    this.auth = getAuth(this.firebaseApp);
    this.authReady = new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(this.auth, () => {
        unsubscribe();
        resolve();
      });
    });
  }

  private getUserFromStorage(): any {
    const userJson =
      localStorage.getItem(USER_STORAGE_KEY) || localStorage.getItem(LEGACY_USER_STORAGE_KEY);
    if (!userJson) return null;
    try {
      return JSON.parse(userJson);
    } catch {
      return null;
    }
  }

  private initFirebaseApp(): FirebaseApp {
    const apps = getApps();
    if (apps.length) return apps[0];
    return initializeApp(environment.firebase);
  }

  get userValue(): any {
    return this.userSubject.value;
  }

  async isAuthenticated(): Promise<boolean> {
    await this.authReady;
    return !!this.auth.currentUser;
  }

  async getIdToken(): Promise<string | null> {
    await this.authReady;
    const user = this.auth.currentUser;
    if (!user) return null;
    return user.getIdToken();
  }

  private saveUser(userToSave: any) {
    if (!userToSave) return;
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userToSave));
    localStorage.setItem(LEGACY_USER_STORAGE_KEY, JSON.stringify(userToSave));
    this.userSubject.next(userToSave);
  }

  setUser(userToSave: any) {
    this.saveUser(userToSave);
  }

  // Login ONLY via Firebase Auth (Google provider).
  loginWithFirebaseGoogle(): Observable<any> {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    return from(signInWithPopup(this.auth, provider)).pipe(
      switchMap((cred) =>
        from(cred.user.getIdToken()).pipe(
          switchMap((idToken) =>
            this.http.post(
              this.apiUrl,
              {
                email: cred.user.email || null,
                name: cred.user.displayName || null,
                photoUrl: cred.user.photoURL || null
              },
              {
                headers: new HttpHeaders({
                  Authorization: `Bearer ${idToken}`
                })
              }
            )
          )
        )
      ),
      tap((response: any) => {
        const userToSave = response?.user || response?.usuario || response;
        this.saveUser(userToSave);
      })
    );
  }

  // Link Google APIs (Calendar/Drive/Meet) via backend OAuth flow.
  async linkGoogleApis(): Promise<void> {
    const token = await this.getIdToken();
    if (!token) throw new Error('No Firebase session');
    window.location.href = `${this.linkGoogleUrl}?token=${encodeURIComponent(token)}`;
  }

  logout() {
    signOut(this.auth).catch(() => undefined);
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(LEGACY_USER_STORAGE_KEY);
    this.userSubject.next(null);
  }
}
