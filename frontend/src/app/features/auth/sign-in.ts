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
  @ViewChild('clerkMount', { static: true }) clerkMount!: ElementRef<HTMLDivElement>;

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

    // Only redirect after a fresh sign-in completes — never on arrival.
    effect(() => {
      const u = this.auth.user();
      if (this.wasLoggedInOnArrival) return;
      if (u?.dbId != null) {
        if (u.username) {
          this.router.navigate(['/feed']);
        } else {
          this.router.navigate(['/profile/edit'], { queryParams: { setup: 'true' } });
        }
      }
    });
  }

  ngOnInit(): void {
    if (!this.alreadySignedIn()) {
      this.auth.mountSignIn(this.clerkMount.nativeElement);
    }
  }

  ngOnDestroy(): void {
    if (!this.alreadySignedIn()) {
      this.auth.unmountSignIn(this.clerkMount.nativeElement);
    }
  }

  /** Sign out the existing session and show the Clerk widget for fresh sign-in. */
  async signOutAndSwitch(): Promise<void> {
    await this.auth.logout();
    this.wasLoggedInOnArrival = false;
    this.alreadySignedIn.set(false);
    this.existingUser.set(null);
    // After logout the Clerk widget needs to be mounted in the now-rendered div.
    setTimeout(() => this.auth.mountSignIn(this.clerkMount.nativeElement));
  }

  continueAsExisting(): void {
    const u = this.auth.user();
    if (!u?.dbId) return;
    this.router.navigate([u.username ? '/feed' : '/profile/edit']);
  }
}
