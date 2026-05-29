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

  private userId: number | string = 'guest';

  leaderboard = signal<LeaderboardEntry[]>([]);
  myRep       = signal<number>(0);
  private playedLocal = signal<Record<string, string[]>>({});
  private solvedLocal = signal<Record<string, string[]>>({});

  private keyPlayed(): string   { return `konkat_mg_played_${this.userId}`; }
  private keySolved(): string   { return `konkat_mg_solved_${this.userId}`; }
  keyWordle(): string           { return `konkat_wordle_day_${this.userId}`; }
  keyPinpoint(): string         { return `konkat_pinpoint_day_${this.userId}`; }

  private static readLS(key: string): Record<string, string[]> {
    try { return JSON.parse(localStorage.getItem(key) ?? '{}'); } catch { return {}; }
  }

  private static writeLS(key: string, data: Record<string, string[]>) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  /** Call once after the user's DB id is known. Loads user-specific local state. */
  init(userId: number | string): void {
    this.userId = userId;
    this.playedLocal.set(MinigamesService.readLS(this.keyPlayed()));
    this.solvedLocal.set(MinigamesService.readLS(this.keySolved()));
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
      MinigamesService.writeLS(this.keyPlayed(), next);
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
              MinigamesService.writeLS(this.keySolved(), next);
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
