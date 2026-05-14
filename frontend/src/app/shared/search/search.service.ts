import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

const API = environment.apiUrl;

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

export interface PostSearchResult {
  id: number;
  content: string;
  authorName: string;
  authorAvatarUrl: string | null;
  tags: string[];
  type: string;
  createdAt: string;
}

export interface QuestionSearchResult {
  id: number;
  title: string;
  authorName: string;
  tags: string[];
  solved: boolean;
  views: number;
  createdAt: string;
}

export interface SearchResults {
  users: UserSearchResult[];
  projects: ProjectSearchResult[];
  hackathons: HackathonSearchResult[];
  posts: PostSearchResult[];
  questions: QuestionSearchResult[];
}

@Injectable({ providedIn: 'root' })
export class SearchService {

  constructor(private http: HttpClient) {}

  /** limit=5 for dropdown, limit=20 for the full results page */
  search(query: string, limit = 5): Observable<SearchResults> {
    return this.http.get<SearchResults>(
      `${API}/search?q=${encodeURIComponent(query)}&limit=${limit}`
    );
  }
}
