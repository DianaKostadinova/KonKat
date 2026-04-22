import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SavedEvent } from './saved-event.model';

const API = 'http://localhost:8081/api';

@Injectable({ providedIn: 'root' })
export class EventService {

  constructor(private http: HttpClient) {}

  /** GET /api/events/saved — upcoming saved events for logged-in user */
  getSavedUpcoming(): Observable<SavedEvent[]> {
    return this.http.get<SavedEvent[]>(`${API}/events/saved`, { headers: this.authHeaders() });
  }

  /** POST /api/hackathons/{id}/save — toggle save */
  toggleSaveHackathon(id: number): Observable<{ saved: boolean }> {
    return this.http.post<{ saved: boolean }>(
      `${API}/hackathons/${id}/save`, {}, { headers: this.authHeaders() }
    );
  }

  /** POST /api/webinars/{id}/save — toggle save */
  toggleSaveWebinar(id: number): Observable<{ saved: boolean }> {
    return this.http.post<{ saved: boolean }>(
      `${API}/webinars/${id}/save`, {}, { headers: this.authHeaders() }
    );
  }

  private authHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return token
      ? new HttpHeaders({ Authorization: `Bearer ${token}` })
      : new HttpHeaders();
  }
}
