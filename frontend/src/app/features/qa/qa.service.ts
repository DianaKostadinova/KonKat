import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { QAQuestion, QAAnswer } from './qa.model';
import { AuthService } from '../../shared/auth/auth.service';

const API = 'http://localhost:8081/api';

@Injectable({ providedIn: 'root' })
export class QAService {
  private _questions = signal<QAQuestion[]>([]);
  loading = signal(false);

  private auth = inject(AuthService);

  get meId()   { return 0; }  // backend resolves via JWT
  get meName() { return this.auth.user()?.name ?? 'You'; }

  constructor(private http: HttpClient) {
    this.load();
  }

  questions() { return this._questions(); }

  load() {
    this.loading.set(true);
    this.http.get<QAQuestion[]>(`${API}/questions`)
      .pipe(catchError(err => { console.error('[QA] load failed:', err); return of([]); }))
      .subscribe(qs => { this._questions.set(qs); this.loading.set(false); });
  }

  createQuestion(data: { title: string; content: string; tags: string[]; codeLanguage?: string; codeSnippet?: string }) {
    // Optimistic: show immediately with a negative temp id
    const tempId = -Date.now();
    const optimistic: QAQuestion = {
      id: tempId,
      author: { id: this.meId, name: this.meName },
      title: data.title,
      content: data.content,
      codeLanguage: data.codeLanguage,
      codeSnippet: data.codeSnippet,
      tags: data.tags,
      votes: 0, userVote: null,
      views: 0, answers: [], answerCount: 0,
      solved: false,
      createdAt: new Date().toISOString(),
    };
    this._questions.update(qs => [optimistic, ...qs]);

    this.http.post<QAQuestion>(`${API}/questions`, data)
      .pipe(catchError(err => { console.error('[QA] createQuestion failed:', err); return of(null); }))
      .subscribe(q => {
        if (q) {
          this._questions.update(qs => qs.map(existing => existing.id === tempId ? q : existing));
        } else {
          this._questions.update(qs => qs.filter(existing => existing.id !== tempId));
        }
      });
  }

  addAnswer(questionId: number, data: { content: string; codeLanguage?: string; codeSnippet?: string }) {
    const tempId = -Date.now();
    const optimistic: QAAnswer = {
      id: tempId,
      author: { id: this.meId, name: this.meName },
      content: data.content,
      codeLanguage: data.codeLanguage,
      codeSnippet: data.codeSnippet,
      votes: 0, userVote: null,
      isAccepted: false,
      createdAt: new Date().toISOString(),
    };
    this._questions.update(qs => qs.map(q =>
      q.id === questionId ? { ...q, answers: [...q.answers, optimistic], answerCount: q.answerCount + 1 } : q
    ));

    this.http.post<QAAnswer>(`${API}/questions/${questionId}/answers`, data)
      .pipe(catchError(err => { console.error('[QA] addAnswer failed:', err); return of(null); }))
      .subscribe(a => {
        if (a) {
          this._questions.update(qs => qs.map(q =>
            q.id === questionId ? { ...q, answers: q.answers.map(ans => ans.id === tempId ? a : ans) } : q
          ));
        } else {
          this._questions.update(qs => qs.map(q =>
            q.id === questionId
              ? { ...q, answers: q.answers.filter(ans => ans.id !== tempId), answerCount: q.answerCount - 1 }
              : q
          ));
        }
      });
  }

  voteQuestion(questionId: number, direction: 'UP' | 'DOWN') {
    this.http.post<{ votes: number; userVote: string | null }>(
      `${API}/questions/${questionId}/vote`, { direction }    ).pipe(catchError(err => { console.error('[QA] voteQuestion failed:', err); return of(null); }))
      .subscribe(r => {
        if (!r) return;
        this._questions.update(qs => qs.map(q =>
          q.id === questionId ? { ...q, votes: r.votes, userVote: r.userVote as 'UP' | 'DOWN' | null } : q
        ));
      });
  }

  voteAnswer(questionId: number, answerId: number, direction: 'UP' | 'DOWN') {
    this.http.post<{ votes: number; userVote: string | null }>(
      `${API}/questions/${questionId}/answers/${answerId}/vote`, { direction }    ).pipe(catchError(err => { console.error('[QA] voteAnswer failed:', err); return of(null); }))
      .subscribe(r => {
        if (!r) return;
        this._questions.update(qs => qs.map(q =>
          q.id === questionId
            ? { ...q, answers: q.answers.map(a => a.id === answerId ? { ...a, votes: r.votes, userVote: r.userVote as 'UP' | 'DOWN' | null } : a) }
            : q
        ));
      });
  }

  acceptAnswer(questionId: number, answerId: number) {
    this.http.post<QAAnswer>(
      `${API}/questions/${questionId}/answers/${answerId}/accept`, {}    ).pipe(catchError(err => { console.error('[QA] acceptAnswer failed:', err); return of(null); }))
      .subscribe(a => {
        if (!a) return;
        this._questions.update(qs => qs.map(q =>
          q.id === questionId
            ? { ...q, solved: true, answers: q.answers.map(ans => ({ ...ans, isAccepted: ans.id === answerId })) }
            : q
        ));
      });
  }
}
