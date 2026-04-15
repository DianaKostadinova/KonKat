import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PostService } from '../post-card/post.service';
import { PostType } from '../post-card/post.model';

@Component({
  selector: 'app-create-post-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './create-post-modal.html',
  styleUrl: './create-post-modal.css',
})
export class CreatePostModal {
  @Input() authorName = '';
  @Input() authorRole = '';
  @Input() authorLocation = '';
  @Output() closed = new EventEmitter<void>();
  @Output() posted = new EventEmitter<void>();

  type = signal<PostType>('text');
  content = '';
  codeSnippet = '';
  language = 'typescript';
  tagsInput = '';

  readonly types: { value: PostType; label: string; icon: string }[] = [
    { value: 'text',  label: 'Text',  icon: 'notes' },
    { value: 'code',  label: 'Code',  icon: 'code' },
    { value: 'media', label: 'Media', icon: 'image' },
  ];

  readonly languages = ['typescript', 'javascript', 'python', 'java', 'go', 'rust', 'css', 'html', 'yaml', 'bash', 'sql'];

  constructor(private postService: PostService) {}

  get canPost(): boolean {
    if (!this.content.trim()) return false;
    if (this.type() === 'code' && !this.codeSnippet.trim()) return false;
    return true;
  }

  submit() {
    if (!this.canPost) return;

    const rawTags = this.tagsInput.split(',').map(t => t.trim()).filter(Boolean);
    const tags = rawTags.map(t => t.startsWith('#') ? t : `#${t}`);

    this.postService.addPost({
      author: {
        name: this.authorName || 'You',
        role: this.authorRole || 'Developer',
        location: this.authorLocation || '',
        time: 'just now',
      },
      type: this.type(),
      content: this.content.trim(),
      code: this.type() === 'code'
        ? { language: this.language, snippet: this.codeSnippet }
        : undefined,
      tags: tags.length ? tags : undefined,
      reactions: { likes: 0, comments: 0, shares: 0 },
      liked: false,
    });

    this.posted.emit();
    this.closed.emit();
  }

  close() {
    this.closed.emit();
  }
}
