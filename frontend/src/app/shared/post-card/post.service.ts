import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, map } from 'rxjs';
import { Post, PostType } from './post.model';
import { AuthService } from '../auth/auth.service';
import { environment } from '../../../environments/environment';

export interface TrendingTag {
  tag: string;
  postCount: number;
  likeCount: number;
}

const API = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class PostService {

  private _posts = signal<Post[]>([]);
  readonly posts = this._posts.asReadonly();

  constructor(private http: HttpClient, private auth: AuthService) {
    if (this.auth.isLoggedIn()) this.loadFeed();
  }

  // ── Queries ───────────────────────────────────────────────────────────────

  getPosts(): Post[] {
    return this._posts();
  }

  loadFeed(followingOnly = false): void {
    const url = followingOnly ? `${API}/posts?filter=following` : `${API}/posts`;
    this.http.get<any[]>(url)
      .subscribe(dtos => this._posts.set(dtos.map(d => this.mapPost(d))));
  }

  loadPostsByTag(tag: string): Observable<Post[]> {
    const clean = tag.replace(/^#/, '');
    return this.http.get<any[]>(`${API}/posts/tag/${encodeURIComponent(clean)}`)
      .pipe(map(dtos => dtos.map(d => this.mapPost(d))));
  }

  loadTrendingTags(): Observable<TrendingTag[]> {
    return this.http.get<TrendingTag[]>(`${API}/tags/trending`);
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
      imageUrl: postData.imageUrl ?? null,
      tags: postData.tags ?? [],
    };
    return this.http.post<any>(`${API}/posts`, body).pipe(
      map(dto => this.mapPost(dto)),
      tap(post => this._posts.update(all => [post, ...all])),
    );
  }

  /**
   * Edits an existing post (author only). On success replaces the post in the
   * feed signal so the updated content (and the "(edited)" indicator) shows up
   * everywhere the post is rendered.
   */
  editPost(postId: number, updates: { content?: string; codeLanguage?: string; codeSnippet?: string; tags?: string[] }): Observable<Post> {
    return this.http.put<any>(`${API}/posts/${postId}`, updates).pipe(
      map(dto => this.mapPost(dto)),
      tap(updated => this._posts.update(all => all.map(p => p.id === postId ? updated : p))),
    );
  }

  /** Deletes a post (author only). On success removes it from the feed signal. */
  deletePost(postId: number): Observable<void> {
    return this.http.delete<void>(`${API}/posts/${postId}`).pipe(
      tap(() => this._posts.update(all => all.filter(p => p.id !== postId))),
    );
  }

  toggleLike(postId: number): void {
    // Optimistic update
    this._posts.update(all =>
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
    this.http.post(`${API}/posts/${postId}/react`, { type: 'LIKE' }, )
      .subscribe();
  }

  toggleSave(postId: number): void {
    // Optimistic update
    this._posts.update(all =>
      all.map(p => p.id !== postId ? p : { ...p, saved: !p.saved })
    );
    // Persist to backend
    this.http.post(`${API}/posts/${postId}/react`, { type: 'SAVE' }, )
      .subscribe();
  }

  addComment(postId: number, author: string, text: string): void {
    const body = { text };
    this.http.post<any>(`${API}/posts/${postId}/comments`, body, )
      .subscribe(() => {
        this._posts.update(all =>
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
        avatarUrl: dto.author.avatarUrl ?? undefined,
      },
      content: dto.content,
      type: dto.type.toLowerCase() as PostType,
      code: dto.codeLanguage
        ? { language: dto.codeLanguage, snippet: dto.codeSnippet ?? '' }
        : undefined,
      imageUrl: dto.imageUrl ?? undefined,
      tags: dto.tags ?? [],
      reactions: {
        likes: Number(dto.reactions?.likes ?? 0),
        comments: Number(dto.commentsCount ?? 0),
        shares: Number(dto.reactions?.shares ?? 0),
      },
      liked: dto.liked ?? false,
      saved: dto.saved ?? false,
      editedAt: dto.editedAt ?? undefined,
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
