import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap, map, share } from 'rxjs';
import { UserProfile } from './profile.model';
import { Post } from '../../shared/post-card/post.model';
import { PostService } from '../../shared/post-card/post.service';

const API = 'http://localhost:8081/api';

const EMPTY_PROFILE: UserProfile = {
  id: 0, name: '', username: '', role: '', company: '', location: '',
  bio: '', github: '', website: '', coverColor: '#E8593C',
  stats: { posts: 0, projects: 0, hackathons: 0, rep: 0, followers: 0, following: 0 },
  interests: [], techStack: [], badges: [], joinedAt: '',
};

@Injectable({ providedIn: 'root' })
export class ProfileService {

  private profile    = signal<UserProfile>({ ...EMPTY_PROFILE });
  private myPosts    = signal<Post[]>([]);
  private savedPosts = signal<Post[]>([]);
  private likedPosts = signal<Post[]>([]);

  constructor(
    private http: HttpClient,
    private postService: PostService,
  ) {}

  // ── Profile read/write ────────────────────────────────────────────────────

  getProfile() { return this.profile(); }

  /** Optimistic local update (for cover colour picker etc.) */
  updateProfile(updates: Partial<UserProfile>) {
    this.profile.update(p => ({ ...p, ...updates }));
  }

  /**
   * Loads the authenticated user's own profile from the DB.
   * Returns an Observable so callers can react once data arrives.
   */
  loadProfile(): Observable<UserProfile> {
    const req$ = this.http.get<any>(`${API}/users/me`, { headers: this.authHeaders() }).pipe(
      tap(data => this.setFromDto(data)),
      map(() => this.profile()),
      share(),
    );
    req$.subscribe({ error: err => console.error('loadProfile failed', err) });
    return req$;
  }

  /**
   * Loads any user's public profile by ID.
   * Used when navigating to /profile/:id.
   * Updates the same internal signal so the template reacts automatically.
   */
  loadPublicProfile(userId: number): Observable<UserProfile> {
    const req$ = this.http.get<any>(`${API}/users/${userId}`, { headers: this.authHeaders() }).pipe(
      tap(data => this.setFromDto(data)),
      map(() => this.profile()),
      share(),
    );
    req$.subscribe({ error: err => console.error('loadPublicProfile failed', err) });
    return req$;
  }

  /**
   * Persists profile changes to the DB.
   * Returns an Observable so the caller can react to success/error.
   */
  saveProfile(updates: Partial<UserProfile>): Observable<UserProfile> {
    const body = {
      displayName:   updates.name         ?? undefined,
      username:      updates.username     ?? undefined,
      title:         updates.role         ?? undefined,   // "role" in frontend = job title in backend
      bio:           updates.bio          ?? undefined,
      location:      updates.location     ?? undefined,
      company:       updates.company      ?? undefined,
      github:        updates.github       ?? undefined,
      website:       updates.website      ?? undefined,
      avatarUrl:     updates.avatar       ?? undefined,
      coverColor:    updates.coverColor   ?? undefined,
      coverImageUrl: updates.coverImage   ?? undefined,
      techStack:     updates.techStack    ?? undefined,
      interests:     updates.interests    ?? undefined,
    };
    return this.http.put<any>(`${API}/users/me`, body, { headers: this.authHeaders() }).pipe(
      tap(data => this.setFromDto(data)),
      map(() => this.profile()),
    );
  }

  // ── Posts ─────────────────────────────────────────────────────────────────

  getMyPosts()    { return this.myPosts(); }
  getSavedPosts() { return this.savedPosts(); }
  getLikedPosts() { return this.likedPosts(); }

  loadMyPosts(userId: number): void {
    this.http.get<any[]>(`${API}/posts/user/${userId}`, { headers: this.authHeaders() })
      .subscribe({
        next: dtos => this.myPosts.set(dtos.map(d => this.postService.mapPost(d))),
        error: err => console.error('loadMyPosts failed', err),
      });
  }

  loadSavedPosts(): void {
    this.http.get<any[]>(`${API}/posts/saved`, { headers: this.authHeaders() })
      .subscribe({
        next: dtos => this.savedPosts.set(dtos.map(d => this.postService.mapPost(d))),
        error: err => console.error('loadSavedPosts failed', err),
      });
  }

  loadLikedPosts(): void {
    this.http.get<any[]>(`${API}/posts`, { headers: this.authHeaders() })
      .subscribe({
        next: dtos => this.likedPosts.set(
          dtos.filter(d => d.liked).map(d => this.postService.mapPost(d))
        ),
        error: err => console.error('loadLikedPosts failed', err),
      });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private setFromDto(data: any): void {
    this.profile.set({
      id:         data.id        ?? 0,
      name:       data.name      ?? '',
      username:   data.username  ?? '',
      role:       data.role      ?? '',   // backend "role" = job title
      company:    data.company   ?? '',
      location:   data.location  ?? '',
      bio:        data.bio       ?? '',
      github:     data.github    ?? '',
      website:    data.website   ?? '',
      avatar:     data.avatar    || undefined,
      coverColor: data.coverColor ?? '#E8593C',
      coverImage: data.coverImage || undefined,
      stats:       data.stats       ?? EMPTY_PROFILE.stats,
      interests:   data.interests   ?? [],
      techStack:   data.techStack   ?? [],
      badges:      data.badges      ?? [],
      joinedAt:    data.joinedAt    ?? '',
      isFollowing: data.isFollowing ?? undefined,
    });
  }

  private authHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return token
      ? new HttpHeaders({ Authorization: `Bearer ${token}` })
      : new HttpHeaders();
  }
}
