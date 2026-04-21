import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../auth/auth.service';

const API = 'http://localhost:8081/api';

export interface UserSearchResult {
  id: number;
  name: string;
  username: string | null;
  role: string | null;
  location: string | null;
  avatarUrl: string | null;
}

export interface ProjectSearchResult {
  id: number;
  title: string;
  description: string | null;
  ownerName: string;
  techStack: string[];
  status: string;
}

export interface HackathonSearchResult {
  id: number;
  title: string;
  status: string;
  location: string | null;
}

export interface SearchResults {
  users: UserSearchResult[];
  projects: ProjectSearchResult[];
  hackathons: HackathonSearchResult[];
}

@Injectable({ providedIn: 'root' })
export class SearchService {

  constructor(
    private http: HttpClient,
    private authService: AuthService,
  ) {}

  search(query: string): Observable<SearchResults> {
    return this.http.get<SearchResults>(
      `${API}/search?q=${encodeURIComponent(query)}`,
      { headers: this.authHeaders() },
    );
  }

  private authHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return token
      ? new HttpHeaders({ Authorization: `Bearer ${token}` })
      : new HttpHeaders();
  }
}
