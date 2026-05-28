import { Injectable, NgZone, signal } from '@angular/core';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  signOut,
  updateProfile,
  User as FbUser,
} from 'firebase/auth';
import { environment } from '../../../environments/environment';
import { runtimeConfig } from '../config/runtime-config';

const API = runtimeConfig.apiUrl;

export interface AuthUser {
  id: string;        // Firebase UID
  dbId?: number;
  username?: string;
  name: string;
  email: string;
  avatar?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {

  private _isLoggedIn = signal(false);
  private _user       = signal<AuthUser | null>(null);
  private _ready      = signal(false);

  isLoggedIn = this._isLoggedIn.asReadonly();
  user       = this._user.asReadonly();
  ready      = this._ready.asReadonly();

  private fbUser: FbUser | null = null;
  private readonly auth = getAuth(
    getApps().length ? getApp() : initializeApp(environment.firebase)
  );

  constructor(private zone: NgZone) {}

  init(): Promise<void> {
    return new Promise(resolve => {
      onAuthStateChanged(this.auth, async fbUser => {
        this.fbUser = fbUser;
        this.zone.run(async () => {
          if (fbUser) {
            this._isLoggedIn.set(true);
            this._user.set({
              id:     fbUser.uid,
              name:   fbUser.displayName ?? fbUser.email?.split('@')[0] ?? 'User',
              email:  fbUser.email ?? '',
              avatar: fbUser.photoURL ?? undefined,
            });
            if (!this._user()?.dbId) {
              void this.firebaseSync();
            }
          } else {
            this._isLoggedIn.set(false);
            this._user.set(null);
          }
          this._ready.set(true);
          resolve();
        });
      });
    });
  }

  async firebaseSync(): Promise<void> {
    const u = this._user();
    if (!u) return;
    if (u.dbId) return;

    let token: string | null = null;
    for (let i = 0; i < 6; i++) {
      token = await this.getToken();
      if (token) break;
      await new Promise(r => setTimeout(r, 500));
    }
    if (!token) {
      console.warn('[Auth] getToken returned null after retries — skipping firebase-sync');
      return;
    }

    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), 10_000);
    try {
      const resp = await fetch(`${API}/users/me/firebase-sync`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: u.email, name: u.name, avatarUrl: u.avatar ?? null }),
        signal: controller.signal,
      });
      if (resp.ok) {
        const me = await resp.json();
        this._user.update(prev => prev ? { ...prev, dbId: me.id as number, username: me.username ?? undefined } : prev);
        console.log('[Auth] firebase-sync ok — DB id=%d username=%s', me.id, me.username);
      } else {
        console.error('[Auth] firebase-sync %d:', resp.status, await resp.text());
      }
    } catch (e) {
      if ((e as DOMException)?.name !== 'AbortError') {
        console.error('[Auth] firebase-sync error:', e);
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async getToken(): Promise<string | null> {
    try {
      return this.fbUser ? await this.fbUser.getIdToken() : null;
    } catch {
      return null;
    }
  }

  setUsername(username: string): void {
    this._user.update(u => u ? { ...u, username: username || undefined } : u);
  }

  async updateDisplayName(fullName: string): Promise<void> {
    if (!this.fbUser) return;
    try {
      await updateProfile(this.fbUser, { displayName: fullName.trim() });
      this._user.update(u => u ? { ...u, name: fullName.trim() } : u);
    } catch (e) {
      console.error('[Auth] updateDisplayName failed:', e);
    }
  }

  // Keep old name as alias so any existing callers don't break
  async updateClerkName(fullName: string): Promise<void> {
    return this.updateDisplayName(fullName);
  }

  async logout(): Promise<void> {
    await signOut(this.auth);
  }
}
