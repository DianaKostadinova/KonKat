import { Injectable, signal } from '@angular/core';
import type { Clerk } from '@clerk/clerk-js';
import { environment } from '../../../environments/environment';

export interface AuthUser {
  id: string;       // Clerk user ID (e.g. "user_2abc...")
  dbId?: number;    // numeric DB primary key — populated after /api/users/me
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
      // Returns the pre-constructed Clerk instance from window.Clerk
      this.clerk = await this.loadClerkFromCdn();
      await this.clerk.load();
      this.syncUser();
      await this.loadDbId();
      this.clerk.addListener(() => this.syncUser());
    } catch (e) {
      console.error('[Auth] Clerk failed to initialise:', e);
    } finally {
      this._ready.set(true);
    }
  }

  // Loads Clerk's full browser bundle from its CDN (the only bundle that includes UI components).
  // Providing the key via both mechanisms so Clerk's auto-init creates window.Clerk as an instance.
  private loadClerkFromCdn(): Promise<Clerk> {
    return new Promise((resolve, reject) => {
      if ((window as any).__clerk_instance) {
        resolve((window as any).__clerk_instance);
        return;
      }

      const base64      = environment.clerkPublishableKey.replace(/^pk_(test|live)_/, '');
      const frontendApi = atob(base64).replace(/\$$/, '');

      // Fallback key source Clerk checks when data-clerk-publishable-key can't be read
      (window as any).__clerk_publishable_key = environment.clerkPublishableKey;

      const s = document.createElement('script');
      s.src   = `https://${frontendApi}/npm/@clerk/clerk-js@latest/dist/clerk.browser.js`;
      s.setAttribute('data-clerk-publishable-key', environment.clerkPublishableKey);
      s.crossOrigin = 'anonymous';

      s.onload = () => {
        // window.Clerk is now the pre-constructed Clerk instance
        const instance = (window as any).Clerk;
        (window as any).__clerk_instance = instance;
        resolve(instance as Clerk);
      };
      s.onerror = () => reject(new Error(`Failed to load Clerk script from ${frontendApi}`));
      document.head.appendChild(s);
    });
  }

  private syncUser(): void {
    const u = this.clerk?.user;
    if (u) {
      this._user.update(prev => ({
        dbId:   prev?.dbId,
        id:     u.id,
        name:   u.fullName ?? u.primaryEmailAddress?.emailAddress ?? 'User',
        email:  u.primaryEmailAddress?.emailAddress ?? '',
        avatar: u.imageUrl ?? undefined,
      }));
      this._isLoggedIn.set(true);
    } else {
      this._user.set(null);
      this._isLoggedIn.set(false);
    }
  }

  private async loadDbId(): Promise<void> {
    const token = await this.getToken();
    if (!token) return;
    try {
      const resp = await fetch('http://localhost:8081/api/users/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.ok) {
        const me = await resp.json();
        this._user.update(u => u ? { ...u, dbId: me.id as number } : u);
      }
    } catch { /* backend unavailable — dbId stays undefined */ }
  }

  async getToken(): Promise<string | null> {
    try {
      return (await this.clerk?.session?.getToken()) ?? null;
    } catch {
      return null;
    }
  }

  async logout(): Promise<void> {
    await this.clerk?.signOut();
  }

  mountSignIn(el: HTMLElement): void {
    this.clerk?.mountSignIn(el as HTMLDivElement);
  }

  unmountSignIn(el: HTMLElement): void {
    this.clerk?.unmountSignIn(el as HTMLDivElement);
  }

  mountUserButton(el: HTMLElement): void {
    this.clerk?.mountUserButton(el as HTMLDivElement, { afterSignOutUrl: '/sign-in' } as any);
  }

  unmountUserButton(el: HTMLElement): void {
    this.clerk?.unmountUserButton(el as HTMLDivElement);
  }
}
