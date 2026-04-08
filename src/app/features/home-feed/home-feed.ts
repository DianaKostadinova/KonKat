import { Component, OnInit, signal } from '@angular/core';
import { PostService } from '../../shared/post-card/post.service';
import { Post } from '../../shared/post-card/post.model';
import { PostCard } from '../../shared/post-card/post-card';

@Component({
  selector: 'app-home-feed',
  standalone: true,
  imports: [PostCard],
  templateUrl: './home-feed.html',
  styleUrl: './home-feed.css',
})
export class HomeFeed implements OnInit {
  posts = signal<Post[]>([]);
  newPostText = signal('');

  constructor(private postService: PostService) {}

  ngOnInit() {
    this.posts.set(this.postService.getPosts());
  }

  onPostInput(event: Event) {
    const input = event.target as HTMLTextAreaElement;
    this.newPostText.set(input.value);
  }
}
