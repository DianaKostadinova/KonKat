import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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

  constructor(private http: HttpClient) {}

  search(query: string): Observable<SearchResults> {
    return this.http.get<SearchResults>(`${API}/search?q=${encodeURIComponent(query)}`);
  }
}
