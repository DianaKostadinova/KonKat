import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ProfileService } from '../profile/profile.service';

export interface LeaderboardEntry {
  id: number;
  name: string;
  avatar?: string | null;
  rep: number;
}

interface SolveResponse {
  rep: number;
  awarded: boolean;
}

@Injectable({ providedIn: 'root' })
export class MinigamesService {
  private http           = inject(HttpClient);
  private profileService = inject(ProfileService);

  private static readonly LS_PLAYED = 'konkat_mg_played';
  private static readonly LS_SOLVED = 'konkat_mg_solved';

  leaderboard = signal<LeaderboardEntry[]>([]);
  myRep = signal<number>(0);
  private playedLocal = signal<Record<string, string[]>>(MinigamesService.readLS(MinigamesService.LS_PLAYED));
  private solvedLocal = signal<Record<string, string[]>>(MinigamesService.readLS(MinigamesService.LS_SOLVED));

  private static readLS(key: string): Record<string, string[]> {
    try { return JSON.parse(localStorage.getItem(key) ?? '{}'); } catch { return {}; }
  }

  private static writeLS(key: string, data: Record<string, string[]>) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  loadLeaderboard(limit = 3) {
    this.http
      .get<LeaderboardEntry[]>(`${environment.apiUrl}/users/leaderboard?limit=${limit}`)
      .subscribe({
        next: (data) => this.leaderboard.set(data ?? []),
        error: () => this.leaderboard.set([]),
      });
  }

  loadMyRep() {
    this.http.get<{ stats: { rep: number } }>(`${environment.apiUrl}/users/me`).subscribe({
      next: (me) => this.myRep.set(me?.stats?.rep ?? 0),
      error: () => {},
    });
  }

  hasSolvedToday(game: string): boolean {
    const today = new Date().toISOString().slice(0, 10);
    return this.solvedLocal()[game]?.includes(today) ?? false;
  }

  hasPlayedToday(game: string): boolean {
    const today = new Date().toISOString().slice(0, 10);
    return this.playedLocal()[game]?.includes(today) ?? false;
  }

  markPlayed(game: string): void {
    const today = new Date().toISOString().slice(0, 10);
    this.playedLocal.update((s) => {
      const next = { ...s, [game]: Array.from(new Set([...(s[game] ?? []), today])) };
      MinigamesService.writeLS(MinigamesService.LS_PLAYED, next);
      return next;
    });
  }

  async awardSolve(game: string): Promise<void> {
    return new Promise((resolve) => {
      this.http
        .post<SolveResponse>(`${environment.apiUrl}/users/me/minigame-solve`, { game })
        .subscribe({
          next: (res) => {
            this.myRep.set(res.rep);
            this.profileService.rep.set(res.rep);
            const today = new Date().toISOString().slice(0, 10);
            this.solvedLocal.update((s) => {
              const next = { ...s, [game]: Array.from(new Set([...(s[game] ?? []), today])) };
              MinigamesService.writeLS(MinigamesService.LS_SOLVED, next);
              return next;
            });
            this.loadLeaderboard();
            resolve();
          },
          error: () => resolve(),
        });
    });
  }
}
