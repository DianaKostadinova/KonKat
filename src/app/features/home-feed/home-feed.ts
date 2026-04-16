import { Component, computed, signal } from '@angular/core';
import { PostService } from '../../shared/post-card/post.service';
import { ProfileService } from '../profile/profile.service';
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
  newPostText = signal('');
  showModal = signal(false);
  modalInitialType = signal<PostType>('text');

  constructor(
    private postService: PostService,
    private profileService: ProfileService,
  ) {}

  get author() {
    return this.profileService.getProfile();
  }

  onPostInput(event: Event) {
    const input = event.target as HTMLTextAreaElement;
    this.newPostText.set(input.value);
  }

  submitPost() {
    const text = this.newPostText().trim();
    if (!text) return;
    this.postService.addPost({
      author: {
        name: this.author.name,
        role: this.author.role,
        location: this.author.location,
        time: 'just now',
        badge: this.author.badges[0]?.label,
      },
      type: 'text',
      content: text,
      reactions: { likes: 0, comments: 0, shares: 0 },
      liked: false,
    });
    this.newPostText.set('');
  }

  openModal(type: PostType) {
    this.modalInitialType.set(type);
    this.showModal.set(true);
  }
}
