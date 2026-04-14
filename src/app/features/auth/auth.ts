import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../shared/auth/auth.service';

type Mode = 'login' | 'register';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './auth.html',
  styleUrl: './auth.css',
})
export class Auth {
  mode = signal<Mode>('login');
  loading = signal(false);
  error = signal('');
  showPassword = signal(false);

  name = '';
  email = '';
  password = '';
  confirmPassword = '';

  constructor(private authService: AuthService) {}

  onSubmit() {
    this.error.set('');

    if (this.mode() === 'login') {
      const result = this.authService.login(this.email, this.password);
      if (!result.success) this.error.set(result.error ?? 'Login failed.');
    } else {
      if (this.password !== this.confirmPassword) {
        this.error.set('Passwords do not match.');
        return;
      }
      if (this.password.length < 6) {
        this.error.set('Password must be at least 6 characters.');
        return;
      }
      const result = this.authService.register(this.name, this.email, this.password);
      if (!result.success) this.error.set(result.error ?? 'Registration failed.');
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