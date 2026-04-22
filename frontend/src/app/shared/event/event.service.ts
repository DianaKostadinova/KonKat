import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { SavedEvent } from './saved-event.model';

const API = 'http://localhost:8081/api';

@Injectable({ providedIn: 'root' })
export class EventService {

  /** Emits whenever the saved-events list should be refreshed (e.g. after a save toggle). */
  private _refresh$ = new Subject<void>();
  readonly refresh$  = this._refresh$.asObservable();

  constructor(private http: HttpClient) {}

  /** Call this after any save/unsave action to tell the right panel to reload. */
  triggerRefresh(): void { this._refresh$.next(); }

  /** GET /api/events/saved — upcoming saved events for logged-in user */
  getSavedUpcoming(): Observable<SavedEvent[]> {
    return this.http.get<SavedEvent[]>(`${API}/events/saved`, { headers: this.authHeaders() });
  }

  private authHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return token
      ? new HttpHeaders({ Authorization: `Bearer ${token}` })
      : new HttpHeaders();
  }
}
