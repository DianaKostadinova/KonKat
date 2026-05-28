import { Component, effect, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { getAuth, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { AuthService } from '../../shared/auth/auth.service';

@Component({
  selector: 'app-sign-in',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './sign-in.html',
  styleUrl:    './sign-in.css',
})
export class SignIn {
  email    = '';
  password = '';
  error    = signal('');
  loading  = signal(false);

  alreadySignedIn = signal(false);
  existingUser    = signal<{ name: string; email: string; avatar?: string } | null>(null);

  private wasLoggedInOnArrival = false;
  private didRedirect = false;

  constructor(private auth: AuthService, private router: Router) {
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

  async signIn(): Promise<void> {
    if (!this.email || !this.password) return;
    this.loading.set(true);
    this.error.set('');
    try {
      await signInWithEmailAndPassword(getAuth(), this.email, this.password);
    } catch (e: any) {
      this.error.set(this.friendlyError(e.code));
    } finally {
      this.loading.set(false);
    }
  }

  async signInWithGoogle(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      await signInWithPopup(getAuth(), new GoogleAuthProvider());
    } catch (e: any) {
      if (e.code !== 'auth/popup-closed-by-user') {
        this.error.set(this.friendlyError(e.code));
      }
    } finally {
      this.loading.set(false);
    }
  }

  async signOutAndSwitch(): Promise<void> {
    await this.auth.logout();
    this.wasLoggedInOnArrival = false;
    this.alreadySignedIn.set(false);
    this.existingUser.set(null);
  }

  continueAsExisting(): void {
    if (!this.auth.isLoggedIn()) return;
    const u = this.auth.user();
    this.router.navigate([u?.username ? '/feed' : '/profile/edit'], {
      queryParams: u?.username ? {} : { setup: 'true' },
    });
  }

  private friendlyError(code: string): string {
    switch (code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'Invalid email or password.';
      case 'auth/too-many-requests':
        return 'Too many attempts. Try again later.';
      case 'auth/network-request-failed':
        return 'Network error. Check your connection.';
      default:
        return 'Sign in failed. Please try again.';
    }
  }
}
