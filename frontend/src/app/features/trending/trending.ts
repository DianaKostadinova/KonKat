import { Component, OnInit, computed, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { distinctUntilChanged, map } from 'rxjs';
import { PostCard } from '../../shared/post-card/post-card';
import { PostService, TrendingTag } from '../../shared/post-card/post.service';
import { Post } from '../../shared/post-card/post.model';

@Component({
  selector: 'app-trending',
  standalone: true,
  imports: [PostCard, FormsModule],
  templateUrl: './trending.html',
  styleUrl: './trending.css',
})
export class Trending implements OnInit {
  trendingTags = signal<TrendingTag[]>([]);
  selectedTag  = signal<string | null>(null);
  searchQuery  = signal('');
  tagPosts     = signal<Post[]>([]);
  loading      = signal(false);

  // When no tag is selected, show only posts that have at least one hashtag
  feedPosts = computed(() =>
    this.postService.posts().filter(p => p.tags && p.tags.length > 0)
  );

  constructor(
    private postService: PostService,
    private route: ActivatedRoute,
    private router: Router,
  ) {
    // Subscribe to query param changes so same-route navigation always triggers a fetch
    this.route.queryParamMap.pipe(
      map(p => p.get('tag')?.trim() || null),   // normalise empty / whitespace to null
      distinctUntilChanged(),
      takeUntilDestroyed(),
    ).subscribe(tag => {
      if (tag) this.fetchTag(tag);
      else     this.resetTagView();
    });
  }

  ngOnInit() {
    this.postService.loadTrendingTags().subscribe({
      next: tags => this.trendingTags.set(tags),
      error: () => {},
    });
  }

  // Called from UI (chip click, search) — updates the URL; the subscription drives the fetch
  selectTag(raw: string) {
    const apiTag = raw.replace(/^#/, '').trim().toLowerCase();
    if (!apiTag) return;  // ignore empty / hash-only input
    this.router.navigate([], { queryParams: { tag: apiTag }, replaceUrl: true });
  }

  onSearch() {
    const q = this.searchQuery().trim();
    if (!q) { this.clearTag(); return; }
    this.selectTag(q);
  }

  clearTag() {
    this.router.navigate([], { queryParams: {}, replaceUrl: true });
  }

  displayTag(raw: string): string {
    return raw.startsWith('#') ? raw : `#${raw}`;
  }

  // Fetches posts for a tag — never touches the URL
  private fetchTag(raw: string) {
    const apiTag     = raw.replace(/^#/, '').trim().toLowerCase();
    if (!apiTag) { this.resetTagView(); return; }   // guard against empty tag
    const displayTag = `#${apiTag}`;
    if (this.selectedTag() === displayTag) return;   // already loaded
    this.selectedTag.set(displayTag);
    this.searchQuery.set(displayTag);
    this.loading.set(true);
    this.postService.loadPostsByTag(apiTag).subscribe({
      next:  posts => { this.tagPosts.set(posts); this.loading.set(false); },
      error: ()    => this.loading.set(false),
    });
  }

  private resetTagView() {
    this.selectedTag.set(null);
    this.searchQuery.set('');
    this.tagPosts.set([]);
  }
}
