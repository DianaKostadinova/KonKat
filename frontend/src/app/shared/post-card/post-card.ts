import { Component, Input, signal, computed, OnInit, HostListener, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Post } from './post.model';
import { PostService } from './post.service';
import { AuthService } from '../auth/auth.service';
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

  // ── Author menu (edit / delete) ──────────────────────────────────────────
  showMenu = signal(false);
  isEditing = signal(false);
  editText = signal('');
  editCode = signal('');
  saving = signal(false);
  showDeleteConfirm = signal(false);
  deleting = signal(false);

  /** True when the logged-in user is the post's author — controls the 3-dot menu visibility. */
  isOwnPost = computed(() => {
    const me = this.auth.user()?.dbId;
    return me != null && me === this.post?.author?.id;
  });

  constructor(
    private postService: PostService,
    private router: Router,
    private auth: AuthService,
    private host: ElementRef<HTMLElement>,
  ) {}

  /** Close the dropdown when clicking outside the card. */
  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent) {
    if (!this.showMenu()) return;
    if (!this.host.nativeElement.contains(e.target as Node)) this.showMenu.set(false);
  }

  goToTag(tag: string) {
    const clean = tag.replace(/^#/, '').toLowerCase().trim();
    if (!clean) return;
    this.router.navigate(['/trending'], { queryParams: { tag: clean } });
  }

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

  // ── Edit / Delete ───────────────────────────────────────────────────────

  toggleMenu(e: MouseEvent) {
    e.stopPropagation();
    this.showMenu.update(v => !v);
  }

  startEdit() {
    this.editText.set(this.post.content);
    this.editCode.set(this.post.code?.snippet ?? '');
    this.isEditing.set(true);
    this.showMenu.set(false);
  }

  cancelEdit() {
    this.isEditing.set(false);
    this.editText.set('');
    this.editCode.set('');
  }

  saveEdit() {
    if (this.saving()) return;
    const newContent = this.editText().trim();
    if (!newContent) return;

    const updates: { content: string; codeSnippet?: string } = { content: newContent };
    if (this.post.type === 'code') updates.codeSnippet = this.editCode();

    this.saving.set(true);
    this.postService.editPost(this.post.id, updates).subscribe({
      next: updated => {
        // The service replaces the post in the feed signal, but the @Input on this
        // card binds to the parent's reference — sync the local copy so the UI updates.
        this.post = updated;
        this.isEditing.set(false);
        this.saving.set(false);
      },
      error: () => this.saving.set(false),
    });
  }

  askDelete() {
    this.showMenu.set(false);
    this.showDeleteConfirm.set(true);
  }

  cancelDelete() {
    this.showDeleteConfirm.set(false);
  }

  confirmDelete() {
    if (this.deleting()) return;
    this.deleting.set(true);
    this.postService.deletePost(this.post.id).subscribe({
      next: () => {
        // The service has already removed the post from the feed signal — the @for
        // in the parent will unmount this component, so no further work is needed.
        this.deleting.set(false);
      },
      error: () => {
        this.deleting.set(false);
        this.showDeleteConfirm.set(false);
      },
    });
  }
}
