import { Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
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

  askTitle = '';
  askContent = '';
  askTagsInput = '';
  askAddCode = false;
  askLanguage = 'typescript';
  askCode = '';

  readonly languages = ['typescript', 'javascript', 'python', 'java', 'go', 'rust', 'css', 'html', 'yaml', 'bash', 'sql'];

  filters = [
    { value: 'all',      label: 'All Questions' },
    { value: 'unsolved', label: 'Unsolved' },
    { value: 'solved',   label: 'Solved' },
  ];

  constructor(readonly qaService: QAService) {}

  filteredQuestions = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const filter = this.selectedFilter();
    return this.qaService.questions().filter(question => {
      const matchesSearch = !q ||
        question.title.toLowerCase().includes(q) ||
        question.tags.some(t => t.toLowerCase().includes(q));
      const matchesFilter =
        filter === 'all'      ? true :
        filter === 'solved'   ? question.solved :
                                !question.solved;
      return matchesSearch && matchesFilter;
    });
  });

  onSearch(e: Event) {
    this.searchQuery.set((e.target as HTMLInputElement).value);
  }

  onVoteQuestion(data: { questionId: number; direction: 'UP' | 'DOWN' }) {
    this.qaService.voteQuestion(data.questionId, data.direction);
  }

  onVoteAnswer(data: { questionId: number; answerId: number; direction: 'UP' | 'DOWN' }) {
    this.qaService.voteAnswer(data.questionId, data.answerId, data.direction);
  }

  onAddAnswer(data: { questionId: number; content: string; codeLanguage?: string; codeSnippet?: string }) {
    this.qaService.addAnswer(data.questionId, {
      content: data.content,
      codeLanguage: data.codeLanguage,
      codeSnippet: data.codeSnippet,
    });
  }

  onAcceptAnswer(data: { questionId: number; answerId: number }) {
    this.qaService.acceptAnswer(data.questionId, data.answerId);
  }

  get canAsk(): boolean {
    return this.askTitle.trim().length > 0 && this.askContent.trim().length > 0;
  }

  submitQuestion() {
    if (!this.canAsk) return;
    const tags = this.askTagsInput.split(',').map(t => t.trim()).filter(Boolean);
    this.qaService.createQuestion({
      title:        this.askTitle.trim(),
      content:      this.askContent.trim(),
      tags,
      codeLanguage: this.askAddCode && this.askCode.trim() ? this.askLanguage : undefined,
      codeSnippet:  this.askAddCode && this.askCode.trim() ? this.askCode.trim() : undefined,
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
