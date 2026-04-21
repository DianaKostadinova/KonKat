import { Component, Input, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Post } from './post.model';
import { PostService } from './post.service';
import { HighlightModule } from 'ngx-highlightjs';

@Component({
  selector: 'app-post-card',
  standalone: true,
  imports: [HighlightModule, FormsModule, RouterLink],
  templateUrl: './post-card.html',
  styleUrl: './post-card.css',
})
export class PostCard implements OnInit {
  @Input() post!: Post;

  liked = signal(false);
  likeCount = signal(0);
  copied = signal(false);
  saved = signal(false);
  showComments = signal(false);
  commentText = signal('');

  constructor(private postService: PostService) {}

  ngOnInit() {
    this.liked.set(this.post.liked ?? false);
    this.likeCount.set(this.post.reactions.likes);
    this.saved.set(this.post.saved ?? false);
  }

  toggleLike() {
    this.liked.update(v => !v);
    this.likeCount.update(v => this.liked() ? v + 1 : v - 1);
    this.postService.toggleLike(this.post.id);
  }

  toggleSave() {
    this.saved.update(v => !v);
    this.postService.toggleSave(this.post.id);
  }

  toggleComments() {
    this.showComments.update(v => !v);
  }

  submitComment() {
    const text = this.commentText().trim();
    if (!text) return;
    this.postService.addComment(this.post.id, 'Diana Kostadinova', text);
    this.post = { ...this.post, comments: [...(this.post.comments ?? []), { id: Date.now(), author: 'Diana Kostadinova', text, time: 'just now' }], reactions: { ...this.post.reactions, comments: this.post.reactions.comments + 1 } };
    this.commentText.set('');
  }

  copyCode() {
    if (this.post.code) {
      navigator.clipboard.writeText(this.post.code.snippet);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    }
  }
}
