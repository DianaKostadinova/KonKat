import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

const API = environment.apiUrl;

export interface FollowResult {
  following: boolean;
  followerCount: number;
}

export interface FollowStatus {
  following: boolean;
  followerCount: number;
  followingCount: number;
}

@Injectable({ providedIn: 'root' })
export class FollowService {

  constructor(private http: HttpClient) {}

  toggle(userId: number): Observable<FollowResult> {
    return this.http.post<FollowResult>(`${API}/users/${userId}/follow`, {});
  }

  getStatus(userId: number): Observable<FollowStatus> {
    return this.http.get<FollowStatus>(`${API}/users/${userId}/follow`);
  }
}
