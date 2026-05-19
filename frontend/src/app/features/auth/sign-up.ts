import { Component, OnInit, OnDestroy, ViewChild, ElementRef, effect, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../shared/auth/auth.service';

@Component({
  selector: 'app-sign-up',
  standalone: true,
  imports: [],
  templateUrl: './sign-in.html',
  styleUrl:    './sign-in.css',
})
export class SignUp implements OnInit, OnDestroy {
  @ViewChild('clerkMount') clerkMount?: ElementRef<HTMLDivElement>;

  alreadySignedIn = signal(false);
  existingUser    = signal<{ name: string; email: string; avatar?: string } | null>(null);

  private wasLoggedInOnArrival = false;
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

    effect(() => {
      if (this.didRedirect || this.wasLoggedInOnArrival) return;
      if (!this.auth.isLoggedIn()) return;

      this.didRedirect = true;
      const u = this.auth.user();
      if (u?.dbId != null && !u.username) {
        this.router.navigate(['/profile/edit'], { queryParams: { setup: 'true' } });
      } else {
        this.router.navigate(['/feed']);
      }
    });
  }

  ngOnInit(): void {
    if (!this.alreadySignedIn()) {
      setTimeout(() => {
        const el = this.clerkMount?.nativeElement;
        if (el) this.auth.mountSignUp(el);
      });
    }
  }

  ngOnDestroy(): void {
    const el = this.clerkMount?.nativeElement;
    if (el) this.auth.unmountSignUp(el);
  }

  async signOutAndSwitch(): Promise<void> {
    await this.auth.logout();
    this.wasLoggedInOnArrival = false;
    this.alreadySignedIn.set(false);
    this.existingUser.set(null);
    setTimeout(() => {
      const el = this.clerkMount?.nativeElement;
      if (el) this.auth.mountSignUp(el);
    });
  }

  continueAsExisting(): void {
    const u = this.auth.user();
    if (!u?.dbId) return;
    this.router.navigate([u.username ? '/feed' : '/profile/edit']);
  }
}
