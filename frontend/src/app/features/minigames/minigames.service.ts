import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

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
  private http = inject(HttpClient);

  leaderboard = signal<LeaderboardEntry[]>([]);
  myRep = signal<number>(0);
  private solvedLocal = signal<Record<string, string[]>>({}); // game -> ISO dates

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

  async awardSolve(game: string): Promise<void> {
    return new Promise((resolve) => {
      this.http
        .post<SolveResponse>(`${environment.apiUrl}/users/me/minigame-solve`, { game })
        .subscribe({
          next: (res) => {
            this.myRep.set(res.rep);
            const today = new Date().toISOString().slice(0, 10);
            this.solvedLocal.update((s) => ({
              ...s,
              [game]: Array.from(new Set([...(s[game] ?? []), today])),
            }));
            this.loadLeaderboard();
            resolve();
          },
          error: () => resolve(),
        });
    });
  }
}
