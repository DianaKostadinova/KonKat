import {
  Component, signal, computed, HostListener, OnInit, OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterModule } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, switchMap, catchError, tap } from 'rxjs/operators';
import { of } from 'rxjs';

import { NotificationDropdown } from '../../shared/notification-bell/notification-bell';
import { NotificationService } from '../../shared/notification-bell/notification.service';
import { WsService } from '../../shared/notification-bell/ws.service';
import { SearchService, SearchResults } from '../../shared/search/search.service';
import { AuthService } from '../../shared/auth/auth.service';
import { ProfileService } from '../../features/profile/profile.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterLink, RouterLinkActive, NotificationDropdown],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar implements OnInit, OnDestroy {

  // ── Search ──────────────────────────────────────────────────────────────────
  isSearchFocused = signal(false);
  searchQuery     = signal('');
  hasSearchQuery  = computed(() => this.searchQuery().length > 0);

  searchResults   = signal<SearchResults | null>(null);
  searching       = signal(false);
  showDropdown    = signal(false);

  /** Total number of results across all categories */
  hasResults = computed(() => {
    const r = this.searchResults();
    return r && (r.users.length + r.projects.length + r.hackathons.length) > 0;
  });

  private searchSubject = new Subject<string>();
  private searchSub?: Subscription;

  // ── Notifications ───────────────────────────────────────────────────────────
  isMobileMenuOpen = signal(false);
  isNotifOpen      = signal(false);

  navLinks = [
    { label: 'Feed',       icon: 'home',           route: '/feed'       },
    { label: 'Projects',   icon: 'folder_copy',    route: '/projects'   },
    { label: 'Hackathons', icon: 'calendar_month', route: '/hackathons' },
    { label: 'Find Team',  icon: 'group',          route: '/find-team'  },
  ];

  avatarUrl = computed(() => this.profileService.getProfile()?.avatar);

  /** Mirror WebSocket connection state for the navbar status dot. */
  wsConnected = computed(() => this.ws.connected());

  constructor(
    public  notificationService: NotificationService,
    private searchService: SearchService,
    private router: Router,
    private authService: AuthService,
    private profileService: ProfileService,
    private ws: WsService,
  ) {}

  ngOnInit(): void {
    if (this.authService.isLoggedIn() && !this.profileService.getProfile()?.avatar) {
      this.profileService.loadProfile().subscribe();
    }

    // Debounce — wait 300 ms after the user stops typing, then fire the API call.
    // switchMap cancels any in-flight request if a new query arrives before the response.
    this.searchSub = this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      tap(q => {
        if (q.length < 2) {
          this.searchResults.set(null);
          this.searching.set(false);
          this.showDropdown.set(false);
        }
      }),
      filter(q => q.trim().length >= 2),
      tap(() => { this.searching.set(true); this.showDropdown.set(true); }),
      switchMap(q =>
        this.searchService.search(q).pipe(
          catchError(() => of(null))
        )
      ),
    ).subscribe(results => {
      this.searchResults.set(results);
      this.searching.set(false);
      this.showDropdown.set(true);
    });
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
  }

  // ── Search handlers ─────────────────────────────────────────────────────────

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
    this.searchSubject.next(value);
  }

  onSearchFocus(): void {
    this.isSearchFocused.set(true);
    // Re-show dropdown if there are existing results
    if (this.searchResults()) this.showDropdown.set(true);
  }

  onSearchBlur(): void {
    this.isSearchFocused.set(false);
    // Small delay so clicks on dropdown items register before hiding
    setTimeout(() => this.showDropdown.set(false), 200);
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.searchResults.set(null);
    this.showDropdown.set(false);
  }

  // ── Navigation from dropdown ────────────────────────────────────────────────

  goToUser(userId: number): void {
    this.clearSearch();
    this.router.navigate(['/profile', userId]);
  }

  goToProject(projectId: number): void {
    this.clearSearch();
    this.router.navigate(['/projects', projectId]);
  }

  goToHackathon(hackathonId: number): void {
    this.clearSearch();
    this.router.navigate(['/hackathons', hackathonId]);
  }

  goToSearchPage(): void {
    const q = this.searchQuery();
    this.clearSearch();
    this.router.navigate(['/search'], { queryParams: { q } });
  }

  onSearchEnter(): void {
    if (this.searchQuery().trim().length >= 2) {
      this.goToSearchPage();
    }
  }

  // ── Other ───────────────────────────────────────────────────────────────────

  toggleMobileMenu(): void { this.isMobileMenuOpen.update(v => !v); }
  toggleNotif(): void      { this.isNotifOpen.update(v => !v); }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.searchQuery.set('');
    this.searchResults.set(null);
    this.showDropdown.set(false);
    this.isSearchFocused.set(false);
    this.isNotifOpen.set(false);
  }
}
