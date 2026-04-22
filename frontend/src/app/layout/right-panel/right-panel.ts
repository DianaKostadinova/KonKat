import { Component, OnDestroy, OnInit, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { AuthService } from '../../shared/auth/auth.service';
import { ProfileService } from '../../features/profile/profile.service';
import { EventService } from '../../shared/event/event.service';
import { UserProfile } from '../../features/profile/profile.model';
import { EventWithCountdown, CountdownTime } from '../../shared/event/saved-event.model';

@Component({
  selector: 'app-right-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './right-panel.html',
  styleUrl: './right-panel.css',
})
export class RightPanel implements OnInit, OnDestroy {

  isOpen   = signal(false);
  profile  = signal<UserProfile | null>(null);
  events   = signal<EventWithCountdown[]>([]);
  loading  = signal(true);

  private timer:       ReturnType<typeof setInterval> | null = null;
  private refreshSub: Subscription | null = null;

  trending = signal([
    { tag: '#nextjs',     posts: '142 posts' },
    { tag: '#tailwind',   posts: '98 posts'  },
    { tag: '#angular',    posts: '76 posts'  },
    { tag: '#ui-design',  posts: '64 posts'  },
    { tag: '#opensource', posts: '51 posts'  },
  ]);

  constructor(
    private router: Router,
    public  auth: AuthService,
    private profileService: ProfileService,
    private eventService: EventService,
  ) {
    effect(() => {
      document.body.style.overflow = this.isOpen() ? 'hidden' : '';
    });
  }

  ngOnInit(): void {
    if (this.auth.isLoggedIn()) {
      this.profileService.loadProfile().subscribe({
        next: p  => { this.profile.set(p); this.loading.set(false); },
        error: () => this.loading.set(false),
      });

      this.loadSavedEvents();

      // Reload whenever a save/unsave happens anywhere in the app
      this.refreshSub = this.eventService.refresh$.subscribe(() => this.loadSavedEvents());
    } else {
      this.loading.set(false);
    }

    // tick every second to update countdowns
    this.timer = setInterval(() => this.tickCountdowns(), 1000);
  }

  ngOnDestroy(): void {
    if (this.timer)      clearInterval(this.timer);
    if (this.refreshSub) this.refreshSub.unsubscribe();
  }

  private loadSavedEvents(): void {
    this.eventService.getSavedUpcoming().subscribe({
      next: list => this.events.set(list.map(e => ({ ...e, countdown: this.calcCountdown(e.startDate) }))),
      error: ()  => {},
    });
  }

  // ── Countdown ─────────────────────────────────────────────────────────────

  private tickCountdowns(): void {
    this.events.update(list =>
      list.map(e => ({ ...e, countdown: this.calcCountdown(e.startDate) }))
    );
  }

  private calcCountdown(startDate: string | null): CountdownTime | null {
    if (!startDate) return null;
    const diff = new Date(startDate).getTime() - Date.now();
    if (diff <= 0) return null;
    return {
      days:    Math.floor(diff / 86_400_000),
      hours:   Math.floor((diff % 86_400_000) / 3_600_000),
      minutes: Math.floor((diff % 3_600_000)  / 60_000),
      seconds: Math.floor((diff % 60_000)     / 1_000),
    };
  }

  formatCountdown(cd: CountdownTime | null): string {
    if (!cd) return 'Starting now';
    if (cd.days  > 0) return `${cd.days}d ${cd.hours}h ${cd.minutes}m`;
    if (cd.hours > 0) return `${cd.hours}h ${cd.minutes}m ${cd.seconds}s`;
    return `${cd.minutes}m ${cd.seconds}s`;
  }

  pad(n: number): string {
    return String(n).padStart(2, '0');
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  toggle()       { this.isOpen.update(v => !v); }
  goToFindTeam() { this.router.navigate(['/find-team']); this.isOpen.set(false); }
  goToHackathons() { this.router.navigate(['/hackathons']); }
  goToProfile()  { this.router.navigate(['/profile']); }
  goToLogin()    { this.router.navigate(['/login']); }

  get repLabel(): string {
    const rep = this.profile()?.stats?.rep ?? 0;
    return rep >= 1000 ? `${(rep / 1000).toFixed(1)}k` : String(rep);
  }
}
