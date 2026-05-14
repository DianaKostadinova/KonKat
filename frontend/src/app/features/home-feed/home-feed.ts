import { Component, computed, signal, effect, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { distinctUntilChanged, map } from 'rxjs';
import { PostService } from '../../shared/post-card/post.service';
import { AuthService } from '../../shared/auth/auth.service';
import { PostCard } from '../../shared/post-card/post-card';
import { CreatePostModal } from '../../shared/create-post-modal/create-post-modal';
import { PostType } from '../../shared/post-card/post.model';

@Component({
  selector: 'app-home-feed',
  standalone: true,
  imports: [PostCard, CreatePostModal],
  templateUrl: './home-feed.html',
  styleUrl: './home-feed.css',
})
export class HomeFeed {
  posts = computed(() => this.postService.getPosts());

  feedFilter = signal<'forYou' | 'following'>('forYou');
  newPostText      = signal('');
  showModal        = signal(false);
  modalInitialType = signal<PostType>('text');

  private pendingPostId = signal<string | null>(null);

  constructor(
    private postService: PostService,
    public authService: AuthService,
    private route: ActivatedRoute,
  ) {
    // React to ?post= param changes even when already on /feed
    this.route.queryParamMap.pipe(
      map(p => p.get('post')),
      distinctUntilChanged(),
      takeUntilDestroyed(),
    ).subscribe(postId => this.pendingPostId.set(postId));

    // Reload feed whenever filter changes
    effect(() => {
      const filter = this.feedFilter();
      this.postService.loadFeed(filter === 'following');
    });

    // Scroll to the target post once it appears in the feed
    effect(() => {
      const postId = this.pendingPostId();
      if (!postId) return;
      const posts = this.posts();
      if (posts.some(p => String(p.id) === postId)) {
        this.pendingPostId.set(null);
        setTimeout(() => {
          const el = document.getElementById(`post-${postId}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('post-highlight');
            setTimeout(() => el.classList.remove('post-highlight'), 2500);
          }
        }, 100);
      }
    });
  }

  get currentUser() {
    return this.authService.user();
  }

  setFilter(filter: 'forYou' | 'following'): void {
    this.feedFilter.set(filter);
  }

  onPostInput(event: Event): void {
    const input = event.target as HTMLTextAreaElement;
    this.newPostText.set(input.value);
  }

  submitQuickPost(): void {
    const text = this.newPostText().trim();
    if (!text) return;

    this.postService.addPost({
      author: {
        id:       this.currentUser?.dbId,
        name:     this.currentUser?.name ?? 'You',
        role:     '',
        location: '',
        time:     'just now',
      },
      type:      'text',
      content:   text,
      tags:      [],
      reactions: { likes: 0, comments: 0, shares: 0 },
      liked:     false,
      saved:     false,
    }).subscribe(() => this.newPostText.set(''));
  }

  openModal(type: PostType): void {
    this.modalInitialType.set(type);
    this.showModal.set(true);
  }
}
