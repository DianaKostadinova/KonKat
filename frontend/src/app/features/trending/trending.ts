import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
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

  constructor(
    private postService: PostService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit() {
    this.postService.loadTrendingTags().subscribe({
      next: tags => this.trendingTags.set(tags),
      error: () => {},
    });

    const tag = this.route.snapshot.queryParamMap.get('tag');
    if (tag) this.selectTag(tag);
  }

  selectTag(raw: string) {
    const apiTag     = raw.replace(/^#/, '').trim().toLowerCase();
    const displayTag = `#${apiTag}`;
    this.selectedTag.set(displayTag);
    this.searchQuery.set(displayTag);
    this.loading.set(true);
    this.router.navigate([], { queryParams: { tag: apiTag }, replaceUrl: true });
    this.postService.loadPostsByTag(apiTag).subscribe({
      next:  posts => { this.tagPosts.set(posts); this.loading.set(false); },
      error: ()    => this.loading.set(false),
    });
  }

  onSearch() {
    const q = this.searchQuery().trim();
    if (!q) { this.clearTag(); return; }
    this.selectTag(q);
  }

  clearTag() {
    this.selectedTag.set(null);
    this.searchQuery.set('');
    this.tagPosts.set([]);
    this.router.navigate([], { queryParams: {}, replaceUrl: true });
  }

  displayTag(raw: string): string {
    return raw.startsWith('#') ? raw : `#${raw}`;
  }
}
