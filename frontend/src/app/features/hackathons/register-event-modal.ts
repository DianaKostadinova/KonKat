import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Hackathon, Webinar } from './hackathons.model';
import { HackathonService } from './hackathons.service';
import { PostService } from '../../shared/post-card/post.service';
import { AuthService } from '../../shared/auth/auth.service';

type Mode    = 'solo' | 'team';
type Step    = 'choose' | 'submitting' | 'share';

@Component({
  selector: 'app-register-event-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './register-event-modal.html',
  styleUrl: './register-event-modal.css',
})
export class RegisterEventModal {
  @Input()  hackathon?: Hackathon;
  @Input()  webinar?:   Webinar;
  @Output() close      = new EventEmitter<void>();
  @Output() registered = new EventEmitter<void>();

  step     = signal<Step>('choose');
  mode     = signal<Mode>('solo');
  error    = signal<string | null>(null);

  teamName = '';
  role     = '';

  // share-step state
  sharePost   = true;
  postContent = '';

  constructor(
    private hackathonService: HackathonService,
    private postService: PostService,
    private auth: AuthService,
  ) {}

  setMode(m: Mode) { this.mode.set(m); }

  get title() { return this.hackathon?.title ?? this.webinar?.title ?? ''; }
  get isWebinar() { return !!this.webinar; }

  // ── Main registration action ──────────────────────────────────────────────

  submit() {
    this.error.set(null);
    this.step.set('submitting');

    if (this.hackathon) {
      const payload = this.mode() === 'team'
        ? { teamName: this.teamName.trim() || undefined, role: this.role.trim() || undefined }
        : {};

      this.hackathonService.registerForHackathon(this.hackathon.id, payload).subscribe({
        next: () => {
          this.buildPostContent();
          this.step.set('share');
          this.registered.emit();
        },
        error: () => {
          this.error.set('Registration failed. You may already be registered.');
          this.step.set('choose');
        },
      });

    } else if (this.webinar) {
      // Webinars: no registration endpoint yet — just offer the share step
      this.buildPostContent();
      this.step.set('share');
      this.registered.emit();
    }
  }

  // ── Share step ────────────────────────────────────────────────────────────

  private buildPostContent() {
    const h = this.hackathon;
    const w = this.webinar;

    if (h) {
      const tags = h.tags.slice(0, 3).map(t => `#${t.replace(/\s+/g, '')}`).join(' ');
      const team = this.mode() === 'team' && this.teamName
        ? ` Team: **${this.teamName}**.`
        : '';
      this.postContent =
        `Just registered for **${h.title}** 🚀\n` +
        `📍 ${h.location}  |  🏆 ${h.prizePool || 'Prize TBD'}\n` +
        (team ? `${team}\n` : '') +
        `\nLooking for teammates! DM me if you're interested.\n${tags} #hackathon`;
    } else if (w) {
      const tags = w.tags.slice(0, 3).map(t => `#${t.replace(/\s+/g, '')}`).join(' ');
      this.postContent =
        `Attending **${w.title}** 📡\n` +
        (w.speakerName ? `Speaker: ${w.speakerName}\n` : '') +
        `\nWho else is joining? ${tags} #webinar`;
    }
  }

  publishPost() {
    if (!this.postContent.trim()) { this.close.emit(); return; }
    const user = this.auth.user();
    this.postService.addPost({
      author: {
        name:     user?.name     ?? 'You',
        role:     '',
        location: '',
        time:     'just now',
      },
      content:   this.postContent,
      type:      'text',
      tags:      this.hackathon?.tags ?? this.webinar?.tags ?? [],
      reactions: { likes: 0, comments: 0, shares: 0 },
    }).subscribe({ complete: () => this.close.emit() });
  }

  skipShare() { this.close.emit(); }
}
