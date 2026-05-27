import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../shared/auth/auth.service';
import { environment } from '../../../environments/environment';

const API = environment.apiUrl;

interface UserSettings {
  emailOnFollow: boolean;
  emailOnPostLike: boolean;
  emailOnPostComment: boolean;
  emailOnMessage: boolean;
  emailOnHackathon: boolean;
  emailOnWebinar: boolean;
  emailOnQa: boolean;
  profileVisibility: string;
  allowDms: string;
  showOnlineStatus: boolean;
}

interface AccountForm {
  displayName: string;
  username: string;
  title: string;
  bio: string;
  location: string;
  company: string;
  github: string;
  website: string;
}

type Section = 'account' | 'notifications' | 'privacy' | 'danger';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './settings.html',
  styleUrl: './settings.css',
})
export class Settings implements OnInit {
  activeSection  = signal<Section>('account');
  saving         = signal(false);
  saved          = signal(false);
  savingAccount  = signal(false);
  savedAccount   = signal(false);
  loading        = signal(true);
  deleteConfirm  = signal(false);
  deleteInput    = signal('');
  deleteError    = signal('');
  deleting       = signal(false);
  globalError    = signal('');

  settings = signal<UserSettings>({
    emailOnFollow: true,
    emailOnPostLike: true,
    emailOnPostComment: true,
    emailOnMessage: true,
    emailOnHackathon: true,
    emailOnWebinar: true,
    emailOnQa: true,
    profileVisibility: 'PUBLIC',
    allowDms: 'EVERYONE',
    showOnlineStatus: true,
  });

  account: AccountForm = {
    displayName: '',
    username: '',
    title: '',
    bio: '',
    location: '',
    company: '',
    github: '',
    website: '',
  };

  sections: { value: Section; label: string; icon: string }[] = [
    { value: 'account',       label: 'Account',       icon: 'manage_accounts' },
    { value: 'notifications', label: 'Notifications',  icon: 'notifications_none' },
    { value: 'privacy',       label: 'Privacy',        icon: 'lock' },
    { value: 'danger',        label: 'Danger Zone',    icon: 'warning_amber' },
  ];

  constructor(
    private http: HttpClient,
    public authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.http.get<UserSettings>(`${API}/users/me/settings`).subscribe({
      next: s => { this.settings.set(s); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.http.get<any>(`${API}/users/me`).subscribe({
      next: p => {
        this.account = {
          displayName: p.name ?? '',
          username:    p.username ?? '',
          title:       p.role ?? '',
          bio:         p.bio ?? '',
          location:    p.location ?? '',
          company:     p.company ?? '',
          github:      p.github ?? '',
          website:     p.website ?? '',
        };
      },
      error: e => console.error('Failed to load profile', e),
    });
  }

  setSection(s: Section): void {
    this.activeSection.set(s);
    this.saved.set(false);
    this.savedAccount.set(false);
    this.deleteConfirm.set(false);
    this.deleteInput.set('');
    this.deleteError.set('');
    this.globalError.set('');
  }

  saveAccount(): void {
    if (this.savingAccount()) return;
    this.savingAccount.set(true);
    this.globalError.set('');
    this.http.put<any>(`${API}/users/me`, this.account).subscribe({
      next: () => {
        this.savingAccount.set(false);
        this.savedAccount.set(true);
        setTimeout(() => this.savedAccount.set(false), 2500);
      },
      error: e => {
        this.savingAccount.set(false);
        this.globalError.set(e?.error?.message ?? 'Failed to save account.');
      },
    });
  }

  save(): void {
    if (this.saving()) return;
    this.saving.set(true);
    this.globalError.set('');
    this.http.put<UserSettings>(`${API}/users/me/settings`, this.settings()).subscribe({
      next: s => {
        this.settings.set(s);
        this.saving.set(false);
        this.saved.set(true);
        setTimeout(() => this.saved.set(false), 2500);
      },
      error: e => {
        this.saving.set(false);
        this.globalError.set(e?.error?.message ?? 'Failed to save settings.');
      },
    });
  }

  updateField(field: keyof UserSettings, value: any): void {
    this.settings.update(s => ({ ...s, [field]: value }));
  }

  confirmDelete(): void {
    if (this.deleteInput() !== 'DELETE') {
      this.deleteError.set('Type DELETE to confirm');
      return;
    }
    this.deleting.set(true);
    this.deleteError.set('');
    this.http.delete(`${API}/users/me`).subscribe({
      next: () => this.authService.logout().then(() => this.router.navigate(['/sign-in'])),
      error: e => {
        this.deleting.set(false);
        this.deleteError.set(e?.error?.message ?? 'Failed to delete account. Try again.');
      },
    });
  }

  get userName(): string { return this.authService.user()?.name ?? ''; }
  get userEmail(): string { return this.authService.user()?.email ?? ''; }

  /** Helper: read a boolean notification field by name */
  getNotifField(field: string): boolean {
    return (this.settings() as any)[field] as boolean;
  }
}
