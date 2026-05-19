import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, Observable, tap } from 'rxjs';
import { Hackathon, Webinar, CreateHackathonPayload, CreateWebinarPayload } from './hackathons.model';
import { EventService } from '../../shared/event/event.service';
import { environment } from '../../../environments/environment';

const API = environment.apiUrl;

export interface RegisterPayload { teamName?: string; role?: string; }
export interface RegisterResult  { registered: boolean; teamName: string | null; role: string | null; participantCount: number; }

@Injectable({ providedIn: 'root' })
export class HackathonService {

  private _hackathons = signal<Hackathon[]>([]);
  private _webinars   = signal<Webinar[]>([]);
  private _loading    = signal(false);

  constructor(
    private http: HttpClient,
    private eventService: EventService,
  ) {}

  // ── Reads ─────────────────────────────────────────────────────────────────

  getHackathons() { return this._hackathons(); }
  getWebinars()   { return this._webinars();   }
  isLoading()     { return this._loading();    }

  loadAll(): void {
    this._loading.set(true);
    forkJoin({
      hackathons: this.http.get<any[]>(`${API}/hackathons`),
      webinars:   this.http.get<any[]>(`${API}/webinars`),
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
      .post<any>(`${API}/hackathons`, payload)
      .pipe(tap(h => this._hackathons.update(list => [this.mapHackathon(h), ...list])));
  }

  updateHackathon(id: number, payload: CreateHackathonPayload): Observable<Hackathon> {
    return this.http
      .put<any>(`${API}/hackathons/${id}`, payload)
      .pipe(tap(h => {
        const mapped = this.mapHackathon(h);
        this._hackathons.update(list => list.map(x => x.id === id ? mapped : x));
      }));
  }

  deleteHackathon(id: number): Observable<void> {
    return this.http
      .delete<void>(`${API}/hackathons/${id}`)
      .pipe(tap(() => this._hackathons.update(list => list.filter(x => x.id !== id))));
  }

  createWebinar(payload: CreateWebinarPayload): Observable<Webinar> {
    return this.http
      .post<any>(`${API}/webinars`, payload)
      .pipe(tap(w => this._webinars.update(list => [this.mapWebinar(w), ...list])));
  }

  updateWebinar(id: number, payload: CreateWebinarPayload): Observable<Webinar> {
    return this.http
      .put<any>(`${API}/webinars/${id}`, payload)
      .pipe(tap(w => {
        const mapped = this.mapWebinar(w);
        this._webinars.update(list => list.map(x => x.id === id ? mapped : x));
      }));
  }

  deleteWebinar(id: number): Observable<void> {
    return this.http
      .delete<void>(`${API}/webinars/${id}`)
      .pipe(tap(() => this._webinars.update(list => list.filter(x => x.id !== id))));
  }

  /** Toggle save — also triggers right-panel refresh via EventService. */
  toggleSaveHackathon(id: number): void {
    this.http
      .post<{ saved: boolean }>(`${API}/hackathons/${id}/save`, {})
      .subscribe({ next: ({ saved }) => {
        this._hackathons.update(list => list.map(h => h.id === id ? { ...h, saved } : h));
        this.eventService.triggerRefresh();   // ← right panel reloads
      }});
  }

  toggleSaveWebinar(id: number): void {
    this.http
      .post<{ saved: boolean }>(`${API}/webinars/${id}/save`, {})
      .subscribe({ next: ({ saved }) => {
        this._webinars.update(list => list.map(w => w.id === id ? { ...w, saved } : w));
        this.eventService.triggerRefresh();   // ← right panel reloads
      }});
  }

  /** Register (or unregister) for a hackathon. */
  registerForHackathon(id: number, payload: RegisterPayload): Observable<RegisterResult> {
    return this.http
      .post<RegisterResult>(`${API}/hackathons/${id}/register`, payload)
      .pipe(tap(res => {
        this._hackathons.update(list =>
          list.map(h => h.id === id ? { ...h, registered: res.registered } : h)
        );
        this.eventService.triggerRefresh();
      }));
  }

  /** GET /api/hackathons/registered — upcoming hackathons the user is registered for. */
  getRegisteredUpcoming(): Observable<any[]> {
    return this.http.get<any[]>(`${API}/hackathons/registered`);
  }

  // ── Mappers ───────────────────────────────────────────────────────────────

  private mapHackathon(h: any): Hackathon {
    // Use a far-future sentinel when no date is set so the countdown doesn't show "starts now"
    const FAR_FUTURE = new Date('2099-01-01T00:00:00');
    const start = h.startDate ? new Date(h.startDate) : FAR_FUTURE;
    const end   = h.endDate   ? new Date(h.endDate)   : FAR_FUTURE;
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
      currentTeams:         h.participantCount ?? 0,
      prizePool:            h.prize          ?? '',
      tags:                 h.tags           ?? [],
      organizer:            h.organizerName  ?? '',
      organizerAvatar:      h.organizerAvatar ?? null,
      status:               this.mapStatus(h.status),
      registered:           h.registered     ?? false,
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

}
