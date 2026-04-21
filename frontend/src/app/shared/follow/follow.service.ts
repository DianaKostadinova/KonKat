import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../auth/auth.service';

const API = 'http://localhost:8081/api';

export interface FollowResult {
  following: boolean;       // new state after toggle
  followerCount: number;
}

export interface FollowStatus {
  following: boolean;
  followerCount: number;
  followingCount: number;
}

@Injectable({ providedIn: 'root' })
export class FollowService {

  constructor(
    private http: HttpClient,
    private authService: AuthService,
  ) {}

  /**
   * Toggle follow / unfollow on a user.
   * One endpoint handles both — backend decides based on current state.
   */
  toggle(userId: number): Observable<FollowResult> {
    return this.http.post<FollowResult>(
      `${API}/users/${userId}/follow`,
      {},
      { headers: this.authHeaders() },
    );
  }

  /**
   * Load the current follow state for a profile page.
   * Called once when navigating to another user's profile.
   */
  getStatus(userId: number): Observable<FollowStatus> {
    return this.http.get<FollowStatus>(
      `${API}/users/${userId}/follow`,
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
