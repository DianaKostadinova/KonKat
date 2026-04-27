import { Component, computed, signal, effect } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
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

  newPostText      = signal('');
  showModal        = signal(false);
  modalInitialType = signal<PostType>('text');

  constructor(
    private postService: PostService,
    public authService: AuthService,
    private route: ActivatedRoute,
  ) {
    const postId = this.route.snapshot.queryParamMap.get('post');
    if (postId) {
      let scrolled = false;
      effect(() => {
        const posts = this.posts();
        if (!scrolled && posts.some(p => String(p.id) === postId)) {
          scrolled = true;
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
  }

  get currentUser() {
    return this.authService.user();
  }

  onPostInput(event: Event): void {
    const input = event.target as HTMLTextAreaElement;
    this.newPostText.set(input.value);
  }

  // Quick single-line post from the feed input bar
  submitQuickPost(): void {
    const text = this.newPostText().trim();
    if (!text) return;

    this.postService.addPost({
      author: {
        id:       this.currentUser?.id,
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
