import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Project } from './project.model';
import { environment } from '../../../environments/environment';

const API = environment.apiUrl;

export interface CreateProjectData {
  title: string;
  description?: string;
  githubUrl?: string;
  liveUrl?: string;
  imageUrl?: string;
  status: string;
  techStack: string[];
}

@Injectable({ providedIn: 'root' })
export class ProjectService {

  private projects = signal<Project[]>([]);

  constructor(private http: HttpClient) {}

  getProjects(): Project[] { return this.projects(); }

  // ── Load ──────────────────────────────────────────────────────────────────

  /**
   * Load the global projects feed (paginated on the backend; we just take the first page).
   * Used by the /projects browse page.
   */
  loadAllProjects(): void {
    this.http.get<{ content: any[] }>(`${API}/projects?page=0&size=50`)
      .subscribe({
        next: res => this.projects.set((res?.content ?? []).map(d => this.mapDto(d))),
        error: err => console.error('loadAllProjects failed', err),
      });
  }

  /** Load projects for the logged-in user */
  loadMyProjects(): void {
    this.http.get<any[]>(`${API}/projects/me`)
      .subscribe({
        next: dtos => this.projects.set(dtos.map(d => this.mapDto(d))),
        error: err => console.error('loadMyProjects failed', err),
      });
  }

  /** Load projects for any user by ID */
  loadUserProjects(userId: number): void {
    this.http.get<any[]>(`${API}/projects/user/${userId}`)
      .subscribe({
        next: dtos => this.projects.set(dtos.map(d => this.mapDto(d))),
        error: err => console.error('loadUserProjects failed', err),
      });
  }

  // ── Create ────────────────────────────────────────────────────────────────

  createProject(data: CreateProjectData): Observable<Project> {
    return this.http.post<any>(`${API}/projects`, data).pipe(
      tap(dto => {
        // Prepend the new project to the list so it appears at the top immediately
        this.projects.update(list => [this.mapDto(dto), ...list]);
      }),
    );
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  /**
   * Toggles a star on a project. Optimistically updates the local signal, then
   * reconciles with the server response (in case the actual count drifted).
   */
  toggleStar(projectId: number): Observable<{ starred: boolean; starCount: number }> {
    // Optimistic update so the UI feels instant.
    this.projects.update(list => list.map(p => p.id !== projectId ? p : {
      ...p,
      starred: !p.starred,
      stars: (p.starred ? p.stars - 1 : p.stars + 1),
    }));
    return this.http.post<{ starred: boolean; starCount: number }>(
      `${API}/projects/${projectId}/star`, {},
    ).pipe(
      tap(res => {
        this.projects.update(list => list.map(p => p.id !== projectId ? p : {
          ...p, starred: res.starred, stars: res.starCount,
        }));
      }),
    );
  }

  deleteProject(projectId: number): Observable<void> {
    return this.http.delete<void>(`${API}/projects/${projectId}`).pipe(
      tap(() => {
        this.projects.update(list => list.filter(p => p.id !== projectId));
      }),
    );
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  getFeatured(): Project[] {
    return this.projects().filter(p => p.featured);
  }

  filterByTech(tech: string): Project[] {
    if (!tech) return this.projects();
    return this.projects().filter(p =>
      p.techStack.some(t => t.toLowerCase().includes(tech.toLowerCase()))
    );
  }

  sortBy(projects: Project[], sort: string): Project[] {
    switch (sort) {
      case 'newest':    return [...projects].sort((a, b) => b.id - a.id);
      case 'popular':   return [...projects].sort((a, b) => b.stars - a.stars);
      case 'discussed': return [...projects].sort((a, b) => b.comments - a.comments);
      default: return projects;
    }
  }

  // ── DTO mapping ───────────────────────────────────────────────────────────

  mapDto(dto: any): Project {
    return {
      id:          dto.id,
      title:       dto.title,
      description: dto.description ?? '',
      thumbnail:   dto.imageUrl ?? undefined,
      author: {
        id:     dto.ownerId,
        name:   dto.ownerName,
        role:   dto.ownerRole ?? '',
        avatar: dto.ownerAvatarUrl ?? undefined,
      },
      techStack: dto.techStack ?? [],
      githubUrl: dto.githubUrl ?? undefined,
      liveUrl:   dto.liveUrl   ?? undefined,
      status:    dto.status    ?? 'IN_PROGRESS',
      stars:     dto.starCount ?? 0,
      starred:   dto.starred ?? false,
      forks:     0,
      comments:  0,
      createdAt: dto.createdAt ? this.timeAgo(dto.createdAt) : 'just now',
    };
  }

  private timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);
    if (mins  < 1)  return 'just now';
    if (mins  < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days  < 7)  return `${days}d ago`;
    return `${Math.floor(days / 7)}w ago`;
  }

}
