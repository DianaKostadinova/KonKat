import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';

export interface AuthUser {
  name: string;
  email: string;
  avatar?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _isLoggedIn = signal(false);
  private _user = signal<AuthUser | null>(null);

  isLoggedIn = this._isLoggedIn.asReadonly();
  user = this._user.asReadonly();

  constructor(private router: Router) {}

  login(email: string, password: string): { success: boolean; error?: string } {
    if (!email || !password) {
      return { success: false, error: 'Please fill in all fields.' };
    }
    // Replace with real API call
    this._user.set({ name: 'Diana Kostadinova', email });
    this._isLoggedIn.set(true);
    this.router.navigate(['/feed']);
    return { success: true };
  }

  register(name: string, email: string, password: string): { success: boolean; error?: string } {
    if (!name || !email || !password) {
      return { success: false, error: 'Please fill in all fields.' };
    }
    // Replace with real API call
    this._user.set({ name, email });
    this._isLoggedIn.set(true);
    this.router.navigate(['/profile/edit'], { queryParams: { setup: 'true' } });
    return { success: true };
  }

  loginWithGoogle() {
    // Replace with real OAuth flow
    this._user.set({ name: 'Diana Kostadinova', email: 'diana@example.com' });
    this._isLoggedIn.set(true);
    this.router.navigate(['/feed']);
  }

  logout() {
    this._user.set(null);
    this._isLoggedIn.set(false);
    this.router.navigate(['/login']);
  }
}