import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { QAQuestion } from './qa.model';

@Component({
  selector: 'app-qa-post-card',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './qa-post-card.html',
  styleUrl: './qa-post-card.css',
})
export class QAPostCard {
  @Input() question!: QAQuestion;
  @Input() meId: number = 0;
  @Output() voteQuestion = new EventEmitter<{ questionId: number; direction: 'UP' | 'DOWN' }>();
  @Output() voteAnswer   = new EventEmitter<{ questionId: number; answerId: number; direction: 'UP' | 'DOWN' }>();
  @Output() addAnswer    = new EventEmitter<{ questionId: number; content: string; codeLanguage?: string; codeSnippet?: string }>();
  @Output() acceptAnswer = new EventEmitter<{ questionId: number; answerId: number }>();

  expanded = signal(false);

  newAnswerContent = '';
  newAnswerAddCode = false;
  newAnswerLanguage = 'typescript';
  newAnswerCode = '';

  readonly languages = ['typescript', 'javascript', 'python', 'java', 'go', 'rust', 'css', 'html', 'yaml', 'bash', 'sql'];

  toggleExpand() { this.expanded.update(v => !v); }

  isAuthor(): boolean {
    return this.meId !== 0 && this.question.author.id === this.meId;
  }

  onVoteQuestion(direction: 'UP' | 'DOWN') {
    this.voteQuestion.emit({ questionId: this.question.id, direction });
  }

  onVoteAnswer(answerId: number, direction: 'UP' | 'DOWN') {
    this.voteAnswer.emit({ questionId: this.question.id, answerId, direction });
  }

  onAcceptAnswer(answerId: number) {
    this.acceptAnswer.emit({ questionId: this.question.id, answerId });
  }

  submitAnswer() {
    if (!this.newAnswerContent.trim()) return;
    this.addAnswer.emit({
      questionId:   this.question.id,
      content:      this.newAnswerContent.trim(),
      codeLanguage: this.newAnswerAddCode && this.newAnswerCode.trim() ? this.newAnswerLanguage : undefined,
      codeSnippet:  this.newAnswerAddCode && this.newAnswerCode.trim() ? this.newAnswerCode.trim() : undefined,
    });
    this.newAnswerContent = '';
    this.newAnswerAddCode = false;
    this.newAnswerCode = '';
  }

  formatDate(iso: string): string {
    try {
      const date = new Date(iso);
      const diff = Date.now() - date.getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1)   return 'just now';
      if (mins < 60)  return `${mins}m ago`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      if (days < 7)   return `${days}d ago`;
      return date.toLocaleDateString();
    } catch { return iso; }
  }
}
