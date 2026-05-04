import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { WorkspaceSummary, WorkspaceDetail, WorkspaceTask, WorkspaceMessage, TaskStatus } from './workspace.model';
import { AuthService } from '../../shared/auth/auth.service';

const API = 'http://localhost:8081/api';

@Injectable({ providedIn: 'root' })
export class WorkspaceService {
  private _summaries = signal<WorkspaceSummary[]>([]);
  private _current   = signal<WorkspaceDetail | null>(null);
  private _messages  = signal<WorkspaceMessage[]>([]);
  loading = signal(false);

  private auth = inject(AuthService);

  get meId()   { return 0; }   // resolved by backend via JWT
  get meName() { return this.auth.user()?.name ?? 'You'; }

  constructor(private http: HttpClient) {}

  summaries() { return this._summaries(); }
  current()   { return this._current(); }
  messages()  { return this._messages(); }

  loadAll() {
    this.loading.set(true);
    this.http.get<WorkspaceSummary[]>(`${API}/workspaces`)
      .pipe(catchError(() => of([])))
      .subscribe(list => { this._summaries.set(list); this.loading.set(false); });
  }

  loadOne(id: number) {
    this.http.get<WorkspaceDetail>(`${API}/workspaces/${id}`)
      .pipe(catchError(() => of(null)))
      .subscribe(ws => this._current.set(ws));
  }

  loadMessages(id: number) {
    this.http.get<WorkspaceMessage[]>(`${API}/workspaces/${id}/messages`)
      .pipe(catchError(() => of([])))
      .subscribe(msgs => this._messages.set(msgs));
  }

  createWorkspace(name: string) {
    return this.http.post<WorkspaceSummary>(`${API}/workspaces`, { name })
      .subscribe({ next: ws => this._summaries.update(list => [...list, ws]) });
  }

  addTask(workspaceId: number, title: string, priority: string) {
    this.http.post<WorkspaceTask>(
      `${API}/workspaces/${workspaceId}/tasks`,
      { title, priority },
    ).pipe(catchError(() => of(null)))
      .subscribe(task => {
        if (!task) return;
        this._current.update(ws => ws ? { ...ws, tasks: [...ws.tasks, task] } : ws);
      });
  }

  moveTask(workspaceId: number, taskId: number, status: TaskStatus) {
    this._current.update(ws => ws ? {
      ...ws,
      tasks: ws.tasks.map(t => t.id === taskId ? { ...t, status } : t),
    } : ws);

    this.http.patch<WorkspaceTask>(
      `${API}/workspaces/${workspaceId}/tasks/${taskId}`,
      { status },
    ).pipe(catchError(() => of(null)))
      .subscribe(updated => {
        if (!updated) return;
        this._current.update(ws => ws ? {
          ...ws,
          tasks: ws.tasks.map(t => t.id === taskId ? updated : t),
        } : ws);
      });
  }

  deleteTask(workspaceId: number, taskId: number) {
    this._current.update(ws => ws ? { ...ws, tasks: ws.tasks.filter(t => t.id !== taskId) } : ws);
    this.http.delete(`${API}/workspaces/${workspaceId}/tasks/${taskId}`)
      .pipe(catchError(() => of(null))).subscribe();
  }

  sendMessage(workspaceId: number, content: string) {
    const tempMsg: WorkspaceMessage = {
      id: -Date.now(),
      senderId: this.meId,
      senderName: this.meName,
      content,
      createdAt: new Date().toISOString(),
    };
    this._messages.update(msgs => [...msgs, tempMsg]);

    this.http.post<WorkspaceMessage>(
      `${API}/workspaces/${workspaceId}/messages`,
      { content },
    ).pipe(catchError(() => of(null)))
      .subscribe(msg => {
        if (!msg) return;
        this._messages.update(msgs => msgs.map(m => m.id === tempMsg.id ? msg : m));
      });
  }
}
