import { Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { QAPost } from './qa.model';
import { QAService } from './qa.service';
import { QAPostCard } from './qa-post-card';

@Component({
  selector: 'app-qa',
  standalone: true,
  imports: [QAPostCard, FormsModule],
  templateUrl: './qa.html',
  styleUrl: './qa.css',
})
export class QA {
  showAskModal = signal(false);
  searchQuery = signal('');
  selectedFilter = signal('all');

  // Ask modal form state
  askTitle = '';
  askContent = '';
  askTagsInput = '';
  askAddCode = false;
  askLanguage = 'typescript';
  askCode = '';

  readonly languages = ['typescript', 'javascript', 'python', 'java', 'go', 'rust', 'css', 'html', 'yaml', 'bash', 'sql'];

  filters = [
    { value: 'all', label: 'All Questions' },
    { value: 'unsolved', label: 'Unsolved' },
    { value: 'solved', label: 'Solved' },
  ];

  constructor(private qaService: QAService) {}

  filteredPosts = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const filter = this.selectedFilter();
    return this.qaService.getAll().filter(p => {
      const matchesSearch = !q ||
        p.title.toLowerCase().includes(q) ||
        p.tags.some(t => t.includes(q));
      const matchesFilter =
        filter === 'all' ? true :
          filter === 'solved' ? p.solved :
            !p.solved;
      return matchesSearch && matchesFilter;
    });
  });

  onSearch(e: Event) {
    this.searchQuery.set((e.target as HTMLInputElement).value);
  }

  onVotePost(data: { postId: number; direction: 'up' | 'down' }) {
    this.qaService.votePost(data.postId, data.direction);
  }

  onVoteComment(data: { postId: number; commentId: number; direction: 'up' | 'down' }) {
    this.qaService.voteComment(data.postId, data.commentId, data.direction);
  }

  onAddComment(data: { postId: number; content: string }) {
    this.qaService.addComment(data.postId, data.content);
  }

  get canAsk(): boolean {
    return this.askTitle.trim().length > 0 && this.askContent.trim().length > 0;
  }

  submitQuestion() {
    if (!this.canAsk) return;
    const tags = this.askTagsInput.split(',').map(t => t.trim()).filter(Boolean);
    this.qaService.addPost({
      title: this.askTitle.trim(),
      content: this.askContent.trim(),
      tags,
      code: this.askAddCode && this.askCode.trim()
        ? { language: this.askLanguage, snippet: this.askCode.trim() }
        : undefined,
    });
    this.closeAskModal();
  }

  closeAskModal() {
    this.showAskModal.set(false);
    this.askTitle = '';
    this.askContent = '';
    this.askTagsInput = '';
    this.askAddCode = false;
    this.askCode = '';
  }
}
