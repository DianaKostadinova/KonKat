import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreateTeamPostRequest, TeamPost } from './teammates.model';

@Injectable({ providedIn: 'root' })
export class TeamService {

  private readonly base = '/api/team-posts';

  constructor(private http: HttpClient) {}

  getAll(hackathonId?: number): Observable<TeamPost[]> {
    const params = hackathonId ? { hackathonId: hackathonId.toString() } : {};
    return this.http.get<TeamPost[]>(this.base, { params });
  }

  create(data: CreateTeamPostRequest): Observable<TeamPost> {
    return this.http.post<TeamPost>(this.base, data);
  }

  requestJoin(teamId: number): Observable<{ status: string }> {
    return this.http.post<{ status: string }>(`${this.base}/${teamId}/request`, {});
  }

  cancelRequest(teamId: number): Observable<{ status: string }> {
    return this.http.delete<{ status: string }>(`${this.base}/${teamId}/request`);
  }
}
