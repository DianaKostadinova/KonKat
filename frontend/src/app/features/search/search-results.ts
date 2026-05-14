import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

import {
  SearchService, SearchResults,
  UserSearchResult, ProjectSearchResult,
  HackathonSearchResult, PostSearchResult, QuestionSearchResult,
} from '../../shared/search/search.service';

export type SearchTab = 'all' | 'people' | 'projects' | 'hackathons' | 'posts' | 'questions';

@Component({
  selector: 'app-search-results',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './search-results.html',
  styleUrl: './search-results.css',
})
export class SearchResultsPage implements OnInit, OnDestroy {

  query   = signal('');
  loading = signal(false);
  results = signal<SearchResults | null>(null);
  activeTab = signal<SearchTab>('all');

  tabs: { key: SearchTab; label: string; icon: string }[] = [
    { key: 'all',        label: 'All',        icon: 'search'          },
    { key: 'people',     label: 'People',     icon: 'person'          },
    { key: 'projects',   label: 'Projects',   icon: 'folder_copy'     },
    { key: 'hackathons', label: 'Hackathons', icon: 'calendar_month'  },
    { key: 'posts',      label: 'Posts',      icon: 'article'         },
    { key: 'questions',  label: 'Q&A',        icon: 'help_outline'    },
  ];

  totalCount = computed(() => {
    const r = this.results();
    if (!r) return 0;
    return r.users.length + r.projects.length + r.hackathons.length +
           r.posts.length + r.questions.length;
  });

  tabCount = computed(() => {
    const r = this.results();
    if (!r) return {} as Record<SearchTab, number>;
    return {
      all:        r.users.length + r.projects.length + r.hackathons.length + r.posts.length + r.questions.length,
      people:     r.users.length,
      projects:   r.projects.length,
      hackathons: r.hackathons.length,
      posts:      r.posts.length,
      questions:  r.questions.length,
    } as Record<SearchTab, number>;
  });

  private routeSub?: Subscription;
  private searchSub?: Subscription;
  private querySubject = new Subject<string>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private searchService: SearchService,
  ) {}

  ngOnInit(): void {
    // Wire debounced search pipeline
    this.searchSub = this.querySubject.pipe(
      debounceTime(200),
      distinctUntilChanged(),
      switchMap(q => {
        if (q.trim().length < 2) {
          this.results.set(null);
          this.loading.set(false);
          return of(null);
        }
        this.loading.set(true);
        return this.searchService.search(q, 20).pipe(catchError(() => of(null)));
      }),
    ).subscribe(r => {
      this.results.set(r);
      this.loading.set(false);
    });

    // React to ?q= changes in the URL
    this.routeSub = this.route.queryParams.subscribe(params => {
      const q = params['q'] ?? '';
      this.query.set(q);
      this.querySubject.next(q);
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
    this.searchSub?.unsubscribe();
  }

  setTab(tab: SearchTab): void { this.activeTab.set(tab); }

  onQueryChange(event: Event): void {
    const q = (event.target as HTMLInputElement).value;
    this.query.set(q);
    this.router.navigate([], { queryParams: { q }, replaceUrl: true });
    this.querySubject.next(q);
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  goToUser(id: number):      void { this.router.navigate(['/profile', id]); }
  goToProject(id: number):   void { this.router.navigate(['/projects', id]); }
  goToHackathon(id: number): void { this.router.navigate(['/hackathons', id]); }
  goToPost(id: number):      void { this.router.navigate(['/feed'], { queryParams: { post: id } }); }
  goToQuestion(id: number):  void { this.router.navigate(['/qa'], { queryParams: { q: id } }); }

  // ── Helpers ────────────────────────────────────────────────────────────────

  statusColor(status: string): string {
    const map: Record<string, string> = {
      OPEN: 'var(--color-success, #22c55e)',
      UPCOMING: 'var(--color-info, #6366f1)',
      CLOSED: 'var(--color-muted, #888)',
      ACTIVE: 'var(--color-success, #22c55e)',
    };
    return map[status] ?? 'var(--color-muted, #888)';
  }

  timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1)   return 'just now';
    if (m < 60)  return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24)  return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }
}
