import { Component, OnDestroy, OnInit, signal, computed, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { AuthService } from '../../shared/auth/auth.service';
import { ProfileService } from '../../features/profile/profile.service';
import { EventService } from '../../shared/event/event.service';
import { HackathonService } from '../../features/hackathons/hackathons.service';
import { PostService, TrendingTag } from '../../shared/post-card/post.service';
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

  isOpen           = signal(false);
  profile          = computed<UserProfile | null>(() => {
    const p = this.profileService.profileSignal();
    return p.id ? p : null;
  });
  events           = signal<EventWithCountdown[]>([]);
  registeredEvents = signal<EventWithCountdown[]>([]);
  loading          = signal(true);

  /** Saved events + registered hackathons merged and deduped, registered ones flagged. */
  upcomingEvents = computed<EventWithCountdown[]>(() => {
    const saved      = this.events();
    const registered = this.registeredEvents().map(e => ({ ...e, registered: true }));
    const savedIds   = new Set(saved.map(e => e.id + '|' + e.type));
    const extra      = registered.filter(e => !savedIds.has(e.id + '|' + e.type));
    const merged     = [
      ...saved.map(e => ({
        ...e,
        registered: registered.some(r => r.id === e.id && r.type === e.type),
      })),
      ...extra,
    ];
    return merged.sort((a, b) => {
      if (!a.startDate) return 1;
      if (!b.startDate) return -1;
      return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    });
  });

  private timer:       ReturnType<typeof setInterval> | null = null;
  private refreshSub: Subscription | null = null;

  trending = signal<TrendingTag[]>([]);

  constructor(
    protected router: Router,
    public  auth: AuthService,
    private profileService: ProfileService,
    private eventService: EventService,
    private hackathonService: HackathonService,
    private postService: PostService,
  ) {
    effect(() => {
      document.body.style.overflow = this.isOpen() ? 'hidden' : '';
    });
  }

  ngOnInit(): void {
    if (this.auth.isLoggedIn()) {
      this.profileService.loadProfile().subscribe({
        next: ()  => this.loading.set(false),
        error: () => this.loading.set(false),
      });

      this.loadSavedEvents();
      this.loadRegisteredEvents();

      // Reload whenever a save/unsave/register happens anywhere in the app
      this.refreshSub = this.eventService.refresh$.subscribe(() => {
        this.loadSavedEvents();
        this.loadRegisteredEvents();
      });
    } else {
      this.loading.set(false);
    }

    if (this.auth.isLoggedIn()) {
      this.postService.loadTrendingTags().subscribe({
        next: tags => this.trending.set(tags),
        error: () => {},
      });
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

  private loadRegisteredEvents(): void {
    this.hackathonService.getRegisteredUpcoming().subscribe({
      next: list => {
        console.log('[RightPanel] registered hackathons:', list);
        this.registeredEvents.set(list.map(h => ({
          id:        h.id,
          type:      'HACKATHON' as const,
          title:     h.title,
          startDate: h.startDate ?? null,
          endDate:   h.endDate   ?? null,
          location:  h.location  ?? null,
          tags:      h.tags      ?? [],
          countdown: this.calcCountdown(h.startDate ?? null),
        })));
      },
      error: err => console.error('[RightPanel] getRegisteredUpcoming failed:', err),
    });
  }

  // ── Countdown ─────────────────────────────────────────────────────────────

  private tickCountdowns(): void {
    this.events.update(list =>
      list.map(e => ({ ...e, countdown: this.calcCountdown(e.startDate) }))
    );
    this.registeredEvents.update(list =>
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

  toggle()         { this.isOpen.update(v => !v); }
  goToFindTeam()   { this.router.navigate(['/find-team']); this.isOpen.set(false); }
  goToHackathons() { this.router.navigate(['/hackathons']); }
  goToProfile()    { this.router.navigate(['/profile']); }
  goToEvents()     { this.router.navigate(['/profile'], { queryParams: { tab: 'events' } }); this.isOpen.set(false); }
  goToLogin()      { this.router.navigate(['/login']); }

  goToTag(raw: string) {
    const clean = raw.replace(/^#/, '').toLowerCase().trim();
    this.router.navigate(['/trending'], { queryParams: { tag: clean } });
    this.isOpen.set(false);
  }

  displayTag(raw: string): string {
    return raw.startsWith('#') ? raw : `#${raw}`;
  }

  get repLabel(): string {
    const rep = this.profile()?.stats?.rep ?? 0;
    return rep >= 1000 ? `${(rep / 1000).toFixed(1)}k` : String(rep);
  }
}
