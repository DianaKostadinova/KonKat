import { Component, OnInit, OnDestroy, ViewChild, ElementRef, effect, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../shared/auth/auth.service';

@Component({
  selector: 'app-sign-in',
  standalone: true,
  imports: [],
  templateUrl: './sign-in.html',
  styleUrl:    './sign-in.css',
})
export class SignIn implements OnInit, OnDestroy {
  @ViewChild('clerkMount') clerkMount?: ElementRef<HTMLDivElement>;

  /**
   * True if the user already had a Clerk session when they navigated to /sign-in
   * (e.g. opened the page in a new tab while logged in elsewhere). In that case
   * we DON'T auto-redirect — we show a "switch account" panel so they can sign
   * out and log in as someone else.
   */
  alreadySignedIn = signal(false);
  existingUser    = signal<{ name: string; email: string; avatar?: string } | null>(null);

  /** Snapshot of the auth state on arrival, captured before the effect runs. */
  private wasLoggedInOnArrival = false;
  /** One-shot guard so the effect navigates at most once. */
  private didRedirect = false;

  constructor(
    private auth: AuthService,
    private router: Router,
  ) {
    this.wasLoggedInOnArrival = this.auth.isLoggedIn();
    if (this.wasLoggedInOnArrival) {
      const u = this.auth.user();
      this.alreadySignedIn.set(true);
      if (u) this.existingUser.set({ name: u.name, email: u.email, avatar: u.avatar });
    }

    // Redirect as soon as Clerk reports a session — don't wait for the
    // backend clerk-sync round-trip. Email/code sign-in completes in-place
    // and won't navigate on its own; OAuth providers do a full bounce, so
    // they trigger this path on the post-redirect re-init.
    effect(() => {
      if (this.didRedirect || this.wasLoggedInOnArrival) return;
      if (!this.auth.isLoggedIn()) return;

      this.didRedirect = true;
      const u = this.auth.user();
      // Brand-new accounts won't have a username yet → go to profile setup.
      // Existing accounts (or anyone with sync still in flight) → feed.
      if (u?.dbId != null && !u.username) {
        this.router.navigate(['/profile/edit'], { queryParams: { setup: 'true' } });
      } else {
        this.router.navigate(['/feed']);
      }
    });
  }

  ngOnInit(): void {
    if (!this.alreadySignedIn()) {
      // Defer to next tick so @ViewChild has resolved after view init.
      setTimeout(() => {
        const el = this.clerkMount?.nativeElement;
        if (el) this.auth.mountSignIn(el);
      });
    }
  }

  ngOnDestroy(): void {
    const el = this.clerkMount?.nativeElement;
    if (el) this.auth.unmountSignIn(el);
  }

  /** Sign out the existing session and show the Clerk widget for fresh sign-in. */
  async signOutAndSwitch(): Promise<void> {
    await this.auth.logout();
    this.wasLoggedInOnArrival = false;
    this.alreadySignedIn.set(false);
    this.existingUser.set(null);
    // After logout the Clerk widget needs to be mounted in the now-rendered div.
    setTimeout(() => {
      const el = this.clerkMount?.nativeElement;
      if (el) this.auth.mountSignIn(el);
    });
  }

  continueAsExisting(): void {
    if (!this.auth.isLoggedIn()) return;
    const u = this.auth.user();
    this.router.navigate([u?.username ? '/feed' : '/profile/edit'], {
      queryParams: u?.username ? {} : { setup: 'true' },
    });
  }
}
