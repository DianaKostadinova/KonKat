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

  constructor(private http: HttpClient) {
    this.meId = this.decodeUserId();
    this.load();
  }

  private headers(): HttpHeaders {
    const token = localStorage.getItem('token') ?? '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  private decodeUserId(): number {
    try {
      const token = localStorage.getItem('token');
      if (!token) return 0;
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.userId ?? 0;
    } catch { return 0; }
  }

  questions() { return this._questions(); }

  load() {
    this.loading.set(true);
    this.http.get<QAQuestion[]>(`${API}/questions`, { headers: this.headers() })
      .pipe(catchError(() => of([])))
      .subscribe(qs => { this._questions.set(qs); this.loading.set(false); });
  }

  createQuestion(data: { title: string; content: string; tags: string[]; codeLanguage?: string; codeSnippet?: string }) {
    this.http.post<QAQuestion>(`${API}/questions`, data, { headers: this.headers() })
      .pipe(catchError(() => of(null)))
      .subscribe(q => { if (q) this._questions.update(qs => [q, ...qs]); });
  }

  addAnswer(questionId: number, data: { content: string; codeLanguage?: string; codeSnippet?: string }) {
    this.http.post<QAAnswer>(`${API}/questions/${questionId}/answers`, data, { headers: this.headers() })
      .pipe(catchError(() => of(null)))
      .subscribe(a => {
        if (!a) return;
        this._questions.update(qs => qs.map(q =>
          q.id === questionId ? { ...q, answers: [...q.answers, a], answerCount: q.answerCount + 1 } : q
        ));
      });
  }

  voteQuestion(questionId: number, direction: 'UP' | 'DOWN') {
    this.http.post<{ votes: number; userVote: string | null }>(
      `${API}/questions/${questionId}/vote`, { direction }, { headers: this.headers() }
    ).pipe(catchError(() => of(null)))
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
    ).pipe(catchError(() => of(null)))
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
    ).pipe(catchError(() => of(null)))
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
