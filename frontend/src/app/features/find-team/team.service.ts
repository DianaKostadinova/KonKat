import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreateTeamPostRequest, TeamPost } from './teammates.model';
import { environment } from '../../../environments/environment';

const API = environment.apiUrl;

export interface TeamRequestDto {
  id: number;
  requester: { id: number; name: string; role: string | null; avatarUrl: string | null };
  message: string | null;
  status: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class TeamService {

  constructor(private http: HttpClient) {}

  getAll(hackathonId?: number): Observable<TeamPost[]> {
    let params = new HttpParams();
    if (hackathonId !== undefined) {
      params = params.set('hackathonId', hackathonId.toString());
    }
    return this.http.get<TeamPost[]>(`${API}/team-posts`, { params });
  }

  create(data: CreateTeamPostRequest): Observable<TeamPost> {
    return this.http.post<TeamPost>(`${API}/team-posts`, data);
  }

  requestJoin(teamId: number): Observable<{ status: string }> {
    return this.http.post<{ status: string }>(`${API}/team-posts/${teamId}/request`, {});
  }

  cancelRequest(teamId: number): Observable<{ status: string }> {
    return this.http.delete<{ status: string }>(`${API}/team-posts/${teamId}/request`);
  }

  getRequests(teamId: number): Observable<TeamRequestDto[]> {
    return this.http.get<TeamRequestDto[]>(`${API}/team-posts/${teamId}/requests`);
  }

  respond(teamId: number, requestId: number, approve: boolean): Observable<TeamRequestDto> {
    return this.http.post<TeamRequestDto>(
      `${API}/team-posts/${teamId}/requests/${requestId}/respond`,
      { approve }
    );
  }
}
