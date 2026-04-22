import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { forkJoin, Observable, tap } from 'rxjs';
import { Hackathon, Webinar, CreateHackathonPayload, CreateWebinarPayload } from './hackathons.model';

const API = 'http://localhost:8081/api';

@Injectable({ providedIn: 'root' })
export class HackathonService {

  private _hackathons = signal<Hackathon[]>([]);
  private _webinars   = signal<Webinar[]>([]);
  private _loading    = signal(false);

  constructor(private http: HttpClient) {}

  // ── Reads ─────────────────────────────────────────────────────────────────

  getHackathons() { return this._hackathons(); }
  getWebinars()   { return this._webinars();   }
  isLoading()     { return this._loading();    }

  /** Fetch both hackathons and webinars from the API in one shot. */
  loadAll(): void {
    this._loading.set(true);
    forkJoin({
      hackathons: this.http.get<any[]>(`${API}/hackathons`, { headers: this.authHeaders() }),
      webinars:   this.http.get<any[]>(`${API}/webinars`,   { headers: this.authHeaders() }),
    }).subscribe({
      next: ({ hackathons, webinars }) => {
        this._hackathons.set(hackathons.map(h => this.mapHackathon(h)));
        this._webinars.set(webinars.map(w => this.mapWebinar(w)));
        this._loading.set(false);
      },
      error: () => this._loading.set(false),
    });
  }

  // ── Writes ────────────────────────────────────────────────────────────────

  createHackathon(payload: CreateHackathonPayload): Observable<Hackathon> {
    return this.http
      .post<any>(`${API}/hackathons`, payload, { headers: this.authHeaders() })
      .pipe(tap(h => this._hackathons.update(list => [this.mapHackathon(h), ...list])));
  }

  createWebinar(payload: CreateWebinarPayload): Observable<Webinar> {
    return this.http
      .post<any>(`${API}/webinars`, payload, { headers: this.authHeaders() })
      .pipe(tap(w => this._webinars.update(list => [this.mapWebinar(w), ...list])));
  }

  toggleSaveHackathon(id: number): void {
    this.http
      .post<{ saved: boolean }>(`${API}/hackathons/${id}/save`, {}, { headers: this.authHeaders() })
      .subscribe({ next: ({ saved }) =>
        this._hackathons.update(list => list.map(h => h.id === id ? { ...h, saved } : h))
      });
  }

  toggleSaveWebinar(id: number): void {
    this.http
      .post<{ saved: boolean }>(`${API}/webinars/${id}/save`, {}, { headers: this.authHeaders() })
      .subscribe({ next: ({ saved }) =>
        this._webinars.update(list => list.map(w => w.id === id ? { ...w, saved } : w))
      });
  }

  // ── Mappers ───────────────────────────────────────────────────────────────

  private mapHackathon(h: any): Hackathon {
    const start = h.startDate ? new Date(h.startDate) : new Date();
    const end   = h.endDate   ? new Date(h.endDate)   : new Date();
    return {
      id:                   h.id,
      title:                h.title          ?? '',
      description:          h.description    ?? '',
      location:             h.location       ?? 'TBD',
      city:                 h.location       ?? 'TBD',
      startDate:            start,
      endDate:              end,
      registrationDeadline: start,
      maxTeams:             h.maxTeamSize     ?? 0,
      currentTeams:         0,
      prizePool:            h.prize          ?? '',
      tags:                 h.tags           ?? [],
      organizer:            h.organizerName  ?? '',
      organizerAvatar:      h.organizerAvatar ?? null,
      status:               this.mapStatus(h.status),
      registered:           false,
      saved:                h.saved          ?? false,
    };
  }

  private mapWebinar(w: any): Webinar {
    return {
      id:           w.id,
      title:        w.title        ?? '',
      description:  w.description  ?? null,
      speakerName:  w.speakerName  ?? null,
      speakerTitle: w.speakerTitle ?? null,
      startDate:    w.startDate    ? new Date(w.startDate) : null,
      endDate:      w.endDate      ? new Date(w.endDate)   : null,
      location:     w.location     ?? null,
      joinUrl:      w.joinUrl      ?? null,
      thumbnailUrl: w.thumbnailUrl ?? null,
      status:       w.status       ?? 'UPCOMING',
      tags:         w.tags         ?? [],
      organizerName: w.organizerName ?? '',
      saved:        w.saved        ?? false,
    };
  }

  private mapStatus(s: string): 'upcoming' | 'ongoing' | 'ended' {
    if (s === 'IN_PROGRESS') return 'ongoing';
    if (s === 'COMPLETED' || s === 'CANCELLED') return 'ended';
    return 'upcoming';
  }

  private authHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }
}
