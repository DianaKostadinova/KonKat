import { Injectable, signal } from '@angular/core';
import type { Clerk } from '@clerk/clerk-js';
import { runtimeConfig } from '../config/runtime-config';

const API = runtimeConfig.apiUrl;

export interface AuthUser {
  id: string;       // Clerk user ID
  dbId?: number;    // numeric DB primary key
  username?: string; // set after clerkSync if user has chosen one
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

  private clerk!: Clerk;

  async init(): Promise<void> {
    try {
      this.clerk = await this.loadClerkFromCdn();
      await this.clerk.load({
        appearance: {
          variables: {
            colorPrimary:         '#E8593C',
            colorBackground:      '#111111',
            colorText:            '#ffffff',
            colorTextSecondary:   '#888888',
            colorInputBackground: '#1a1a1a',
            colorInputText:       '#ffffff',
          },
        },
      } as any);

      this.syncUser();

      // Session JWT may not be immediately available after load() with CDN approach —
      // trigger sync once now and again on every auth state change.
      this.clerk.addListener(() => {
        this.syncUser();
        if (this._isLoggedIn() && !this._user()?.dbId) {
          void this.clerkSync();
        }
      });

      // Await so routes know the user's DB username before the guard runs
      await this.clerkSync();

    } catch (e) {
      console.error('[Auth] Clerk failed to initialise:', e);
    } finally {
      this._ready.set(true);
    }
  }

  // ── DB account linking ───────────────────────────────────────────────

  async clerkSync(): Promise<void> {
    const clerkUser = this._user();
    if (!clerkUser) return;
    if (clerkUser.dbId) return; // already linked

    // Retry getting the token — session JWT may arrive slightly after load()
    let token: string | null = null;
    for (let i = 0; i < 6; i++) {
      token = await this.getToken();
      if (token) break;
      await new Promise(r => setTimeout(r, 500));
    }

    if (!token) {
      console.warn('[Auth] getToken returned null after retries — skipping clerk-sync');
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);
    try {
      const resp = await fetch(`${API}/users/me/clerk-sync`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email:     clerkUser.email,
          name:      clerkUser.name,
          avatarUrl: clerkUser.avatar ?? null,
          username:  (this.clerk.user as any)?.username ?? null,
        }),
        signal: controller.signal,
      });

      if (resp.ok) {
        const me = await resp.json();
        this._user.update(u => u ? { ...u, dbId: me.id as number, username: me.username ?? undefined } : u);
        console.log('[Auth] clerk-sync ok — DB id=%d name=%s username=%s', me.id, me.name, me.username);
      } else {
        const text = await resp.text();
        console.error('[Auth] clerk-sync %d:', resp.status, text);
      }
    } catch (e) {
      if ((e as DOMException)?.name !== 'AbortError') {
        console.error('[Auth] clerk-sync error:', e);
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // ── Clerk CDN loader ─────────────────────────────────────────────────

  private loadClerkFromCdn(): Promise<Clerk> {
    return new Promise((resolve, reject) => {
      if ((window as any).__clerk_instance) {
        resolve((window as any).__clerk_instance);
        return;
      }

      const publishableKey = runtimeConfig.clerkPublishableKey;
      const base64      = publishableKey.replace(/^pk_(test|live)_/, '');
      const frontendApi = atob(base64).replace(/\$$/, '');

      (window as any).__clerk_publishable_key = publishableKey;

      const s = document.createElement('script');
      s.src   = `https://${frontendApi}/npm/@clerk/clerk-js@latest/dist/clerk.browser.js`;
      s.setAttribute('data-clerk-publishable-key', publishableKey);
      s.crossOrigin = 'anonymous';

      s.onload = () => {
        const instance = (window as any).Clerk;
        (window as any).__clerk_instance = instance;
        resolve(instance as Clerk);
      };
      s.onerror = () => reject(new Error(`Failed to load Clerk from ${frontendApi}`));
      document.head.appendChild(s);
    });
  }

  // ── Internal helpers ─────────────────────────────────────────────────

  private syncUser(): void {
    const u = this.clerk?.user;
    if (u) {
      this._user.update(prev => ({
        dbId:     prev?.dbId,
        username: prev?.username,
        id:       u.id,
        name:     u.fullName ?? u.primaryEmailAddress?.emailAddress ?? 'User',
        email:    u.primaryEmailAddress?.emailAddress ?? '',
        avatar:   u.imageUrl ?? undefined,
      }));
      this._isLoggedIn.set(true);
    } else {
      this._user.set(null);
      this._isLoggedIn.set(false);
    }
  }

  async getToken(): Promise<string | null> {
    try {
      return (await this.clerk?.session?.getToken()) ?? null;
    } catch {
      return null;
    }
  }

  // ── Public API ───────────────────────────────────────────────────────

  setUsername(username: string): void {
    this._user.update(u => u ? { ...u, username: username || undefined } : u);
  }

  async logout(): Promise<void> {
    await this.clerk?.signOut();
  }

  mountSignIn(el: HTMLElement): void {
    this.clerk?.mountSignIn(el as HTMLDivElement, { signUpUrl: '/sign-up' } as any);
  }

  unmountSignIn(el: HTMLElement): void {
    this.clerk?.unmountSignIn(el as HTMLDivElement);
  }

  mountSignUp(el: HTMLElement): void {
    this.clerk?.mountSignUp(el as HTMLDivElement, { signInUrl: '/sign-in' } as any);
  }

  unmountSignUp(el: HTMLElement): void {
    this.clerk?.unmountSignUp(el as HTMLDivElement);
  }

  mountUserButton(el: HTMLElement): void {
    this.clerk?.mountUserButton(el as HTMLDivElement, { afterSignOutUrl: '/sign-in' } as any);
  }

  unmountUserButton(el: HTMLElement): void {
    this.clerk?.unmountUserButton(el as HTMLDivElement);
  }
}
