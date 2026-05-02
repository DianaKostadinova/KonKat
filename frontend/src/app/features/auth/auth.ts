import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../shared/auth/auth.service';
import { ForgotPasswordModal } from './forgot-password-modal';

type Mode = 'login' | 'register';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [RouterLink, FormsModule, ForgotPasswordModal],
  templateUrl: './auth.html',
  styleUrl: './auth.css',
})
export class Auth {
  mode = signal<Mode>('login');
  showForgotPassword = signal(false);
  loading = signal(false);
  error = signal('');
  showPassword = signal(false);

  name = '';
  email = '';
  password = '';
  confirmPassword = '';

  constructor(private authService: AuthService) {}

  async onSubmit() {
    this.error.set('');
    this.loading.set(true);

    try {
      if (this.mode() === 'login') {
        const result = await this.authService.login(this.email, this.password);
        if (!result.success) this.error.set(result.error ?? 'Login failed.');
      } else {
        if (this.password !== this.confirmPassword) {
          this.error.set('Passwords do not match.');
          return;
        }
        if (this.password.length < 8) {
          this.error.set('Password must be at least 8 characters.');
          return;
        }
        if (!/[A-Z]/.test(this.password)) {
          this.error.set('Password must contain at least one uppercase letter.');
          return;
        }
        if (!/[0-9]/.test(this.password)) {
          this.error.set('Password must contain at least one number.');
          return;
        }
        if (!/[^A-Za-z0-9]/.test(this.password)) {
          this.error.set('Password must contain at least one special character.');
          return;
        }
        const result = await this.authService.register(this.name, this.email, this.password);
        if (!result.success) this.error.set(result.error ?? 'Registration failed.');
      }
    } finally {
      this.loading.set(false);
    }
  }

  onGoogleLogin() {
    this.authService.loginWithGoogle();
  }

  switchMode(mode: Mode) {
    this.mode.set(mode);
    this.error.set('');
    this.name = '';
    this.email = '';
    this.password = '';
    this.confirmPassword = '';
  }
}
