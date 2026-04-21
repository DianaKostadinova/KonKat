import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap, map } from 'rxjs';
import { Post, PostType } from './post.model';
import { AuthService } from '../auth/auth.service';

const API = 'http://localhost:8081/api';

@Injectable({ providedIn: 'root' })
export class PostService {

  private posts = signal<Post[]>([]);

  constructor(
    private http: HttpClient,
    private authService: AuthService,
  ) {
    this.loadFeed();
  }

  // ── Queries ───────────────────────────────────────────────────────────────

  getPosts(): Post[] {
    return this.posts();
  }

  loadFeed(): void {
    this.http.get<any[]>(`${API}/posts`, { headers: this.authHeaders() })
      .subscribe(dtos => this.posts.set(dtos.map(d => this.mapPost(d))));
  }

  // ── Mutations ─────────────────────────────────────────────────────────────

  /**
   * Creates a post via the API.
   * Returns an Observable — subscribe in the calling component.
   * On success the new post is prepended to the feed signal.
   */
  addPost(postData: Omit<Post, 'id'>): Observable<Post> {
    const body = {
      content: postData.content,
      type: postData.type.toUpperCase(),
      codeLanguage: postData.code?.language ?? null,
      codeSnippet: postData.code?.snippet ?? null,
      tags: postData.tags ?? [],
    };
    return this.http.post<any>(`${API}/posts`, body, { headers: this.authHeaders() }).pipe(
      map(dto => this.mapPost(dto)),
      tap(post => this.posts.update(all => [post, ...all])),
    );
  }

  toggleLike(postId: number): void {
    // Optimistic update
    this.posts.update(all =>
      all.map(p => p.id !== postId ? p : {
        ...p,
        liked: !p.liked,
        reactions: {
          ...p.reactions,
          likes: p.liked ? p.reactions.likes - 1 : p.reactions.likes + 1,
        },
      })
    );
    // Persist to backend
    this.http.post(`${API}/posts/${postId}/react`, { type: 'LIKE' }, { headers: this.authHeaders() })
      .subscribe();
  }

  toggleSave(postId: number): void {
    // Optimistic update
    this.posts.update(all =>
      all.map(p => p.id !== postId ? p : { ...p, saved: !p.saved })
    );
    // Persist to backend
    this.http.post(`${API}/posts/${postId}/react`, { type: 'SAVE' }, { headers: this.authHeaders() })
      .subscribe();
  }

  addComment(postId: number, author: string, text: string): void {
    const body = { text };
    this.http.post<any>(`${API}/posts/${postId}/comments`, body, { headers: this.authHeaders() })
      .subscribe(() => {
        this.posts.update(all =>
          all.map(p => {
            if (p.id !== postId) return p;
            const comment = { id: Date.now(), author, text, time: 'just now' };
            return {
              ...p,
              comments: [...(p.comments ?? []), comment],
              reactions: { ...p.reactions, comments: p.reactions.comments + 1 },
            };
          })
        );
      });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private authHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return token
      ? new HttpHeaders({ Authorization: `Bearer ${token}` })
      : new HttpHeaders();
  }

  /** Maps a backend PostDto to the frontend Post shape */
  mapPost(dto: any): Post {
    return {
      id: dto.id,
      author: {
        id: dto.author.id,
        name: dto.author.name,
        role: dto.author.username ?? '',
        location: dto.author.location ?? '',
        time: this.timeAgo(dto.createdAt),
      },
      content: dto.content,
      type: dto.type.toLowerCase() as PostType,
      code: dto.codeLanguage
        ? { language: dto.codeLanguage, snippet: dto.codeSnippet ?? '' }
        : undefined,
      tags: dto.tags ?? [],
      reactions: {
        likes: Number(dto.reactions?.likes ?? 0),
        comments: Number(dto.commentsCount ?? 0),
        shares: Number(dto.reactions?.shares ?? 0),
      },
      liked: dto.liked ?? false,
      saved: dto.saved ?? false,
    };
  }

  private timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1)  return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7)  return `${days}d ago`;
    return `${Math.floor(days / 7)}w ago`;
  }
}
