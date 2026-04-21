import { Component, Input, Output, EventEmitter, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PostService } from '../post-card/post.service';
import { AuthService } from '../auth/auth.service';
import { PostType } from '../post-card/post.model';

@Component({
  selector: 'app-create-post-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './create-post-modal.html',
  styleUrl: './create-post-modal.css',
})
export class CreatePostModal implements OnInit {
  @Input() initialType: PostType = 'text';
  @Output() closed = new EventEmitter<void>();
  @Output() posted = new EventEmitter<void>();

  type       = signal<PostType>('text');
  submitting = signal(false);
  error      = signal('');

  content     = '';
  codeSnippet = '';
  language    = 'typescript';
  tagsInput   = '';

  readonly types: { value: PostType; label: string; icon: string }[] = [
    { value: 'text',  label: 'Text',  icon: 'notes' },
    { value: 'code',  label: 'Code',  icon: 'code' },
    { value: 'media', label: 'Media', icon: 'image' },
  ];

  readonly languages = [
    'typescript', 'javascript', 'python', 'java', 'kotlin',
    'go', 'rust', 'css', 'html', 'yaml', 'bash', 'sql',
  ];

  constructor(
    private postService: PostService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.type.set(this.initialType);
  }

  get canPost(): boolean {
    if (!this.content.trim()) return false;
    if (this.type() === 'code' && !this.codeSnippet.trim()) return false;
    return true;
  }

  submit(): void {
    if (!this.canPost || this.submitting()) return;
    this.submitting.set(true);
    this.error.set('');

    const rawTags = this.tagsInput.split(',').map(t => t.trim()).filter(Boolean);
    const tags    = rawTags.map(t => t.startsWith('#') ? t : `#${t}`);
    const user    = this.authService.user();

    this.postService.addPost({
      author: {
        id:       user?.id,
        name:     user?.name ?? 'You',
        role:     '',
        location: '',
        time:     'just now',
      },
      type:    this.type(),
      content: this.content.trim(),
      code: this.type() === 'code'
        ? { language: this.language, snippet: this.codeSnippet }
        : undefined,
      tags:      tags.length ? tags : [],
      reactions: { likes: 0, comments: 0, shares: 0 },
      liked:     false,
      saved:     false,
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.posted.emit();
        this.closed.emit();
      },
      error: (err) => {
        this.submitting.set(false);
        const msg = err?.error?.message ?? err?.message ?? 'Something went wrong. Try again.';
        this.error.set(msg);
        console.error('createPost failed', err);
      },
    });
  }

  close(): void {
    this.closed.emit();
  }
}
