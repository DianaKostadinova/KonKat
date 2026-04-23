import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  avatar?: string;
}

interface AuthResponse {
  token?: string;
  user?: { id: number; email: string; displayName: string; avatarUrl?: string };
  error?: string;
}

const API = 'http://localhost:8081/api';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _isLoggedIn = signal(false);
  private _user = signal<AuthUser | null>(null);

  isLoggedIn = this._isLoggedIn.asReadonly();
  user = this._user.asReadonly();

  constructor(private http: HttpClient, private router: Router) {
    this.restoreSession();
  }

  async login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    if (!email || !password) return { success: false, error: 'Please fill in all fields.' };

    try {
      const res = await firstValueFrom(
        this.http.post<AuthResponse>(`${API}/auth/login`, { email, password })
      );
      if (res.error || !res.token || !res.user) return { success: false, error: res.error ?? 'Login failed' };
      this.setSession(res.token, res.user);
      this.router.navigate(['/feed']);
      return { success: true };
    } catch (err) {
      return { success: false, error: this.extractError(err, 'Wrong email or password.') };
    }
  }

  async register(name: string, email: string, password: string): Promise<{ success: boolean; error?: string }> {
    if (!name || !email || !password) return { success: false, error: 'Please fill in all fields.' };

    try {
      const res = await firstValueFrom(
        this.http.post<AuthResponse>(`${API}/auth/register`, { email, password, displayName: name })
      );
      if (res.error || !res.token || !res.user) return { success: false, error: res.error ?? 'Registration failed' };
      this.setSession(res.token, res.user);
      this.router.navigate(['/profile/edit'], { queryParams: { setup: 'true' } });
      return { success: true };
    } catch (err) {
      return { success: false, error: this.extractError(err, 'Registration failed. Try a different email.') };
    }
  }

  loginWithGoogle() {
    // TODO: implement OAuth flow
    console.warn('Google login not yet implemented');
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this._user.set(null);
    this._isLoggedIn.set(false);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  private setSession(token: string, user: { id: number; email: string; displayName: string; avatarUrl?: string }) {
    localStorage.setItem('token', token);
    const authUser: AuthUser = { id: user.id, name: user.displayName, email: user.email, avatar: user.avatarUrl };
    localStorage.setItem('user', JSON.stringify(authUser));
    this._user.set(authUser);
    this._isLoggedIn.set(true);
  }

  private restoreSession() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (token && user) {
      this._user.set(JSON.parse(user));
      this._isLoggedIn.set(true);
    }
  }

  /** Pull the backend's error message out of an HttpErrorResponse, or fall back to a default. */
  private extractError(err: unknown, fallback: string): string {
    if (err instanceof HttpErrorResponse) {
      // Backend sends { error: "..." } in the response body
      const msg = err.error?.error ?? err.error?.message ?? err.message;
      if (msg && typeof msg === 'string' && !msg.startsWith('Http failure')) return msg;
    }
    return fallback;
  }
}
