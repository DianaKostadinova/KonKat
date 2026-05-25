import { ChangeDetectorRef, Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProfileService } from '../profile.service';
import { AuthService } from '../../../shared/auth/auth.service';
import { UserProfile } from '../profile.model';
import { environment } from '../../../../environments/environment';

const API = environment.apiUrl;

@Component({
  selector: 'app-edit-profile',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './edit-profile.html',
  styleUrl: './edit-profile.css',
})
export class EditProfile implements OnInit {
  isSetup  = signal(false);
  saving   = signal(false);
  error    = signal('');
  usernameStatus = signal<'idle' | 'checking' | 'available' | 'taken'>('idle');

  // Form fields
  name      = '';
  username  = '';
  role      = '';
  company   = '';
  location  = '';
  bio       = '';
  github    = '';
  website   = '';
  avatar    = '';
  coverColor = '#E8593C';

  // Tag inputs
  techStack:    string[] = [];
  interests:    string[] = [];
  techInput     = '';
  interestInput = '';

  private originalUsername = '';
  private usernameCheckTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private profileService: ProfileService,
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.isSetup.set(this.route.snapshot.queryParamMap.get('setup') === 'true');

    this.profileService.loadProfile().subscribe({
      next: (p) => {
        const u = this.auth.user();
        // If DB name is empty or still set to the email (no real name synced yet),
        // fall back to whatever Clerk has on the live user object.
        const hasRealName = p.name && p.name !== u?.email;
        this.name = hasRealName ? p.name : (u?.name !== u?.email ? (u?.name ?? '') : '');
        this.username         = p.username;
        this.originalUsername = p.username;
        this.role             = p.role;
        this.company          = p.company;
        this.location         = p.location;
        this.bio              = p.bio;
        this.github           = p.github;
        this.website          = p.website ?? '';
        this.avatar           = p.avatar ?? '';
        this.coverColor       = p.coverColor;
        this.techStack        = [...p.techStack];
        this.interests        = [...p.interests];
        this.cdr.detectChanges();
      },
      error: (err) => this.error.set('Could not load profile — ' + (err?.message ?? 'unknown error')),
    });
  }

  // ── Avatar ────────────────────────────────────────────────────────────────

  onAvatarChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    resizeImage(file, 512, 512).then(dataUrl => { this.avatar = dataUrl; this.cdr.detectChanges(); });
  }

  // ── Username availability ─────────────────────────────────────────────────

  onUsernameInput(): void {
    const val = this.username.trim();

    if (this.usernameCheckTimer) clearTimeout(this.usernameCheckTimer);

    if (!val || val === this.originalUsername) {
      this.usernameStatus.set('idle');
      return;
    }

    this.usernameStatus.set('checking');
    this.usernameCheckTimer = setTimeout(() => this.checkUsername(val), 400);
  }

  private async checkUsername(username: string): Promise<void> {
    try {
      const resp = await fetch(`${API}/users/check-username?username=${encodeURIComponent(username)}`);
      const data = await resp.json();
      if (this.username.trim() === username) {
        this.usernameStatus.set(data.available ? 'available' : 'taken');
      }
    } catch {
      this.usernameStatus.set('idle');
    }
  }

  // ── Tag helpers ───────────────────────────────────────────────────────────

  addTech(): void {
    const val = this.techInput.trim();
    if (val && !this.techStack.includes(val)) this.techStack = [...this.techStack, val];
    this.techInput = '';
  }

  removeTech(tech: string): void {
    this.techStack = this.techStack.filter(t => t !== tech);
  }

  onTechKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ',') { event.preventDefault(); this.addTech(); }
  }

  addInterest(): void {
    const val = this.interestInput.trim();
    if (val && !this.interests.includes(val)) this.interests = [...this.interests, val];
    this.interestInput = '';
  }

  removeInterest(interest: string): void {
    this.interests = this.interests.filter(i => i !== interest);
  }

  onInterestKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ',') { event.preventDefault(); this.addInterest(); }
  }

  // ── Save ─────────────────────────────────────────────────────────────────

  save(): void {
    if (this.saving()) return;

    if (this.isSetup() && !this.username.trim()) {
      this.error.set('Please choose a username to continue.');
      return;
    }

    if (this.usernameStatus() === 'taken') {
      this.error.set('That username is already taken. Please choose a different one.');
      return;
    }

    this.saving.set(true);
    this.error.set('');

    const updates: Partial<UserProfile> = {
      name:       this.name.trim(),
      username:   this.username.trim(),
      role:       this.role.trim(),
      company:    this.company.trim(),
      location:   this.location.trim(),
      bio:        this.bio.trim(),
      github:     this.github.trim(),
      website:    this.website.trim() || undefined,
      avatar:     this.avatar || undefined,
      coverColor: this.coverColor,
      techStack:  this.techStack,
      interests:  this.interests,
    };

    this.profileService.saveProfile(updates).subscribe({
      next: () => {
        this.saving.set(false);
        this.auth.setUsername(updates.username ?? '');
        if (updates.name) void this.auth.updateClerkName(updates.name);
        this.router.navigate(this.isSetup() ? ['/feed'] : ['/profile']);
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(
          err?.error?.message ?? err?.message ?? 'Failed to save — please try again.'
        );
        console.error('saveProfile error', err);
      },
    });
  }

  cancel(): void {
    this.router.navigate(this.isSetup() ? ['/feed'] : ['/profile']);
  }

  readonly coverOptions = [
    '#E8593C', '#6366f1', '#10b981', '#f59e0b',
    '#ec4899', '#3b82f6', '#8b5cf6', '#14b8a6',
  ];
}

function resizeImage(file: File, maxW: number, maxH: number): Promise<string> {
  return new Promise(resolve => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxW / img.width, maxH / img.height);
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.src = url;
  });
}
