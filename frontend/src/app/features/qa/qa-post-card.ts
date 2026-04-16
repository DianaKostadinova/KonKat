import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { QAPost } from './qa.model';

@Component({
  selector: 'app-qa-post-card',
  standalone: true,
  imports: [],
  templateUrl: './qa-post-card.html',
  styleUrl: './qa-post-card.css',
})
export class QAPostCard {
  @Input() post!: QAPost;
  @Output() votePost = new EventEmitter<{ postId: number; direction: 'up' | 'down' }>();
  @Output() voteComment = new EventEmitter<{ postId: number; commentId: number; direction: 'up' | 'down' }>();
  @Output() addComment = new EventEmitter<{ postId: number; content: string }>();

  expanded = signal(false);
  newComment = signal('');

  toggleExpand() { this.expanded.update(v => !v); }

  onVotePost(direction: 'up' | 'down') {
    this.votePost.emit({ postId: this.post.id, direction });
  }

  onVoteComment(commentId: number, direction: 'up' | 'down') {
    this.voteComment.emit({ postId: this.post.id, commentId, direction });
  }

  onCommentInput(e: Event) {
    this.newComment.set((e.target as HTMLTextAreaElement).value);
  }

  submitComment() {
    if (!this.newComment().trim()) return;
    this.addComment.emit({ postId: this.post.id, content: this.newComment() });
    this.newComment.set('');
  }
}
