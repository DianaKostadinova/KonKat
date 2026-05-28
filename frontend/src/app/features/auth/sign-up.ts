import { Component, effect, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { getAuth, createUserWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { AuthService } from '../../shared/auth/auth.service';

@Component({
  selector: 'app-sign-up',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './sign-up.html',
  styleUrl:    './sign-in.css',
})
export class SignUp {
  name     = '';
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
      this.router.navigate(['/profile/edit'], { queryParams: { setup: 'true' } });
    });
  }

  async signUp(): Promise<void> {
    if (!this.name || !this.email || !this.password) return;
    this.loading.set(true);
    this.error.set('');
    try {
      const cred = await createUserWithEmailAndPassword(getAuth(), this.email, this.password);
      await updateProfile(cred.user, { displayName: this.name.trim() });
    } catch (e: any) {
      this.error.set(this.friendlyError(e.code));
    } finally {
      this.loading.set(false);
    }
  }

  async signUpWithGoogle(): Promise<void> {
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
    const u = this.auth.user();
    if (!u?.dbId) return;
    this.router.navigate([u.username ? '/feed' : '/profile/edit']);
  }

  private friendlyError(code: string): string {
    switch (code) {
      case 'auth/email-already-in-use':
        return 'An account with this email already exists.';
      case 'auth/weak-password':
        return 'Password must be at least 6 characters.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/network-request-failed':
        return 'Network error. Check your connection.';
      default:
        return 'Sign up failed. Please try again.';
    }
  }
}
