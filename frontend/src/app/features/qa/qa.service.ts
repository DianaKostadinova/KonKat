import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { QAQuestion, QAAnswer } from './qa.model';

const API = 'http://localhost:8081/api';

@Injectable({ providedIn: 'root' })
export class QAService {
  private _questions = signal<QAQuestion[]>([]);
  loading = signal(false);
  readonly meId: number;
  readonly meName: string;

  constructor(private http: HttpClient) {
    this.meId   = this.readUser()?.id   ?? 0;
    this.meName = this.readUser()?.name ?? 'You';
    this.load();
  }

  private headers(): HttpHeaders {
    const token = localStorage.getItem('token') ?? '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  private readUser(): { id: number; name: string } | null {
    try {
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  questions() { return this._questions(); }

  load() {
    this.loading.set(true);
    this.http.get<QAQuestion[]>(`${API}/questions`, { headers: this.headers() })
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

    this.http.post<QAQuestion>(`${API}/questions`, data, { headers: this.headers() })
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

    this.http.post<QAAnswer>(`${API}/questions/${questionId}/answers`, data, { headers: this.headers() })
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
      `${API}/questions/${questionId}/vote`, { direction }, { headers: this.headers() }
    ).pipe(catchError(err => { console.error('[QA] voteQuestion failed:', err); return of(null); }))
      .subscribe(r => {
        if (!r) return;
        this._questions.update(qs => qs.map(q =>
          q.id === questionId ? { ...q, votes: r.votes, userVote: r.userVote as 'UP' | 'DOWN' | null } : q
        ));
      });
  }

  voteAnswer(questionId: number, answerId: number, direction: 'UP' | 'DOWN') {
    this.http.post<{ votes: number; userVote: string | null }>(
      `${API}/questions/${questionId}/answers/${answerId}/vote`, { direction }, { headers: this.headers() }
    ).pipe(catchError(err => { console.error('[QA] voteAnswer failed:', err); return of(null); }))
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
      `${API}/questions/${questionId}/answers/${answerId}/accept`, {}, { headers: this.headers() }
    ).pipe(catchError(err => { console.error('[QA] acceptAnswer failed:', err); return of(null); }))
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
