import { Component, Output, EventEmitter, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../shared/auth/auth.service';
import { Router } from '@angular/router';

const API = 'http://localhost:8081/api';

type Step = 'email' | 'sent' | 'reset' | 'done';

@Component({
  selector: 'app-forgot-password-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './forgot-password-modal.html',
})
export class ForgotPasswordModal {
  @Output() close = new EventEmitter<void>();

  step      = signal<Step>('email');
  email     = '';
  token     = '';          // filled from devToken or the reset-link URL
  newPass   = '';
  confirmPass = '';
  showPass  = signal(false);
  loading   = signal(false);
  error     = signal('');
  devToken  = signal<string | null>(null);   // shown in dev so you can test without email

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private router: Router,
  ) {}

  // ── Step 1: request reset ─────────────────────────────────────────────────

  async submitEmail() {
    if (!this.email.trim()) { this.error.set('Please enter your email.'); return; }
    this.error.set('');
    this.loading.set(true);
    this.http.post<{ message: string; devToken?: string }>(
      `${API}/auth/forgot-password`, { email: this.email.trim().toLowerCase() }
    ).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.devToken.set(res.devToken ?? null);
        if (res.devToken) this.token = res.devToken;   // pre-fill for dev convenience
        this.step.set('sent');
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Something went wrong. Please try again.');
      },
    });
  }

  // ── Step 2: enter new password ────────────────────────────────────────────

  async submitReset() {
    if (!this.token.trim())       { this.error.set('Token is required.'); return; }
    if (this.newPass.length < 8)  { this.error.set('Password must be at least 8 characters.'); return; }
    if (!/[A-Z]/.test(this.newPass)) { this.error.set('Password must contain at least one uppercase letter.'); return; }
    if (!/[0-9]/.test(this.newPass)) { this.error.set('Password must contain at least one number.'); return; }
    if (this.newPass !== this.confirmPass) { this.error.set('Passwords do not match.'); return; }

    this.error.set('');
    this.loading.set(true);
    this.http.post<{ token?: string; user?: any; error?: string }>(
      `${API}/auth/reset-password`, { token: this.token.trim(), newPassword: this.newPass }
    ).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.error) { this.error.set(res.error); return; }
        this.step.set('done');
        // Auto-login with the returned JWT
        if (res.token && res.user) {
          localStorage.setItem('token', res.token);
          localStorage.setItem('user', JSON.stringify({
            id: res.user.id, name: res.user.displayName,
            email: res.user.email, avatar: res.user.avatarUrl,
          }));
        }
      },
      error: (err) => {
        this.loading.set(false);
        const msg = err.error?.error ?? err.error?.message ?? err.message;
        this.error.set((msg && !msg.startsWith('Http failure')) ? msg : 'Something went wrong. Please try again.');
      },
    });
  }

  goToReset()  { this.error.set(''); this.step.set('reset'); }
  goToLogin()  { this.close.emit(); this.router.navigate(['/login']); }
}
