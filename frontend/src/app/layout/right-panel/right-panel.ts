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
    const p = this.profileService.myProfileSignal();
    return p.id ? p : null;
  });

  // ── Draggable mobile FAB ─────────────────────────────────────────────────
  /** User-intended position (persisted). May be clamped to the visible viewport at render time. */
  fabX = signal<number | null>(null);
  fabY = signal<number | null>(null);
  dragging = signal(false);

  /**
   * Tracks the current *visible* viewport. Shrinks when the mobile soft keyboard opens
   * (via the visualViewport API), so we can clamp the FAB and keep it on-screen.
   */
  private viewportW = signal<number>(typeof window !== 'undefined' ? window.innerWidth  : 1024);
  private viewportH = signal<number>(typeof window !== 'undefined' ? window.innerHeight : 768);

  /** Position actually applied to the DOM — fabX/fabY clamped against the visible viewport. */
  displayedFabX = computed<number | null>(() => {
    const x = this.fabX();
    if (x === null) return null;
    return Math.max(
      RightPanel.FAB_MARGIN,
      Math.min(this.viewportW() - RightPanel.FAB_SIZE - RightPanel.FAB_MARGIN, x),
    );
  });
  displayedFabY = computed<number | null>(() => {
    const y = this.fabY();
    if (y === null) return null;
    return Math.max(
      RightPanel.FAB_MARGIN,
      Math.min(this.viewportH() - RightPanel.FAB_SIZE - RightPanel.FAB_MARGIN, y),
    );
  });

  private drag = {
    active: false,
    moved: false,
    pointerStartX: 0,
    pointerStartY: 0,
    offsetX: 0,
    offsetY: 0,
  };
  private viewportResizeCleanup: (() => void) | null = null;
  private static readonly FAB_POS_KEY = 'konkat:fab-pos';
  private static readonly FAB_SIZE = 48;
  private static readonly FAB_MARGIN = 16;
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
    this.restoreFabPosition();
    this.installViewportListener();

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
    this.viewportResizeCleanup?.();
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
    const rep = this.profileService.myRep();
    return rep >= 1000 ? `${(rep / 1000).toFixed(1)}k` : String(rep);
  }

  // ── Draggable FAB ─────────────────────────────────────────────────────────

  /**
   * Keep `viewportW`/`viewportH` in sync with the *visible* viewport. This shrinks
   * when the mobile soft keyboard opens, and the `displayedFab*` computeds re-clamp
   * the FAB so it can't be pushed off-screen by the keyboard.
   */
  private installViewportListener(): void {
    if (typeof window === 'undefined') return;
    const vv = window.visualViewport;
    const sync = () => {
      this.viewportW.set(vv?.width  ?? window.innerWidth);
      this.viewportH.set(vv?.height ?? window.innerHeight);
    };
    sync();
    window.addEventListener('resize', sync);
    vv?.addEventListener('resize', sync);
    vv?.addEventListener('scroll', sync);
    this.viewportResizeCleanup = () => {
      window.removeEventListener('resize', sync);
      vv?.removeEventListener('resize', sync);
      vv?.removeEventListener('scroll', sync);
    };
  }

  private restoreFabPosition(): void {
    try {
      const raw = localStorage.getItem(RightPanel.FAB_POS_KEY);
      if (!raw) return;
      const { x, y } = JSON.parse(raw);
      if (typeof x === 'number' && typeof y === 'number') {
        this.fabX.set(this.clampX(x));
        this.fabY.set(this.clampY(y));
      }
    } catch {}
  }

  private clampX(x: number): number {
    const max = window.innerWidth - RightPanel.FAB_SIZE - RightPanel.FAB_MARGIN;
    return Math.max(RightPanel.FAB_MARGIN, Math.min(max, x));
  }

  private clampY(y: number): number {
    const max = window.innerHeight - RightPanel.FAB_SIZE - RightPanel.FAB_MARGIN;
    return Math.max(RightPanel.FAB_MARGIN, Math.min(max, y));
  }

  onFabPointerDown(e: PointerEvent): void {
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    this.drag.active = true;
    this.drag.moved = false;
    this.drag.pointerStartX = e.clientX;
    this.drag.pointerStartY = e.clientY;
    this.drag.offsetX = e.clientX - rect.left;
    this.drag.offsetY = e.clientY - rect.top;
    target.setPointerCapture(e.pointerId);
  }

  onFabPointerMove(e: PointerEvent): void {
    if (!this.drag.active) return;
    if (!this.drag.moved) {
      const dist = Math.hypot(
        e.clientX - this.drag.pointerStartX,
        e.clientY - this.drag.pointerStartY,
      );
      if (dist < 6) return;
      this.drag.moved = true;
      this.dragging.set(true);
    }
    this.fabX.set(this.clampX(e.clientX - this.drag.offsetX));
    this.fabY.set(this.clampY(e.clientY - this.drag.offsetY));
  }

  onFabPointerUp(e: PointerEvent): void {
    if (!this.drag.active) return;
    this.drag.active = false;
    const target = e.currentTarget as HTMLElement;
    try { target.releasePointerCapture(e.pointerId); } catch {}

    if (this.drag.moved) {
      // Snap to the nearest vertical edge (left or right).
      const x = this.fabX() ?? 0;
      const y = this.fabY() ?? 0;
      const centerX = x + RightPanel.FAB_SIZE / 2;
      const snappedX = centerX < window.innerWidth / 2
        ? RightPanel.FAB_MARGIN
        : window.innerWidth - RightPanel.FAB_SIZE - RightPanel.FAB_MARGIN;
      this.fabX.set(snappedX);
      this.fabY.set(y);
      try {
        localStorage.setItem(
          RightPanel.FAB_POS_KEY,
          JSON.stringify({ x: snappedX, y }),
        );
      } catch {}
      this.dragging.set(false);
    }
  }

  onFabClick(e: MouseEvent): void {
    if (this.drag.moved) {
      // The pointerup completed a drag; swallow the synthetic click.
      this.drag.moved = false;
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    this.toggle();
  }
}
