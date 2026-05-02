import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../../shared/auth/auth.service';
import { CreateTeamPostRequest, TeamPost } from './teammates.model';

const API = 'http://localhost:8081/api';

export interface TeamRequestDto {
  id: number;
  requester: { id: number; name: string; role: string | null; avatarUrl: string | null };
  message: string | null;
  status: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class TeamService {

  constructor(
    private http: HttpClient,
    private auth: AuthService,
  ) {}

  // ── Public reads (no auth needed) ─────────────────────────────────────────

  getAll(hackathonId?: number): Observable<TeamPost[]> {
    let params = new HttpParams();
    if (hackathonId !== undefined) {
      params = params.set('hackathonId', hackathonId.toString());
    }
    return this.http.get<TeamPost[]>(`${API}/team-posts`, { params });
  }

  // ── Writes (auth required) ────────────────────────────────────────────────

  create(data: CreateTeamPostRequest): Observable<TeamPost> {
    return this.http.post<TeamPost>(`${API}/team-posts`, data, { headers: this.authHeaders() });
  }

  requestJoin(teamId: number): Observable<{ status: string }> {
    return this.http.post<{ status: string }>(
      `${API}/team-posts/${teamId}/request`, {}, { headers: this.authHeaders() }
    );
  }

  cancelRequest(teamId: number): Observable<{ status: string }> {
    return this.http.delete<{ status: string }>(
      `${API}/team-posts/${teamId}/request`, { headers: this.authHeaders() }
    );
  }

  // ── Author-only ───────────────────────────────────────────────────────────

  getRequests(teamId: number): Observable<TeamRequestDto[]> {
    return this.http.get<TeamRequestDto[]>(
      `${API}/team-posts/${teamId}/requests`, { headers: this.authHeaders() }
    );
  }

  respond(teamId: number, requestId: number, approve: boolean): Observable<TeamRequestDto> {
    return this.http.post<TeamRequestDto>(
      `${API}/team-posts/${teamId}/requests/${requestId}/respond`,
      { approve },
      { headers: this.authHeaders() }
    );
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private authHeaders(): HttpHeaders {
    const token = this.auth.getToken();
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }
}
