import { Component, Input, signal, OnInit } from '@angular/core';
import { Post } from './post.model';
import { PostService } from './post.service';

@Component({
  selector: 'app-post-card',
  standalone: true,
  imports: [],
  templateUrl: './post-card.html',
  styleUrl: './post-card.css',
})
export class PostCard implements OnInit {
  @Input() post!: Post;

  liked = signal(false);
  likeCount = signal(0);
  copied = signal(false);

  constructor(private postService: PostService) {}

  ngOnInit() {
    this.liked.set(this.post.liked ?? false);
    this.likeCount.set(this.post.reactions.likes);
  }

  toggleLike() {
    this.liked.update(v => !v);
    this.likeCount.update(v => this.liked() ? v + 1 : v - 1);
    this.postService.toggleLike(this.post.id);
  }

  copyCode() {
    if (this.post.code) {
      navigator.clipboard.writeText(this.post.code.snippet);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    }
  }
}
