import { Injectable, signal, computed } from '@angular/core';

export interface LeaderboardEntry {
  name: string;
  rep: number;
  solved: number;
}

const STORAGE_KEY = 'konkat_minigames_v1';
const REP_PER_SOLVE = 3;

interface StoredState {
  entries: Record<string, LeaderboardEntry>;
  me: string;
  solvedToday: Record<string, string[]>;
}

@Injectable({ providedIn: 'root' })
export class MinigamesService {
  private state = signal<StoredState>(this.load());

  leaderboard = computed<LeaderboardEntry[]>(() =>
    Object.values(this.state().entries)
      .sort((a, b) => b.rep - a.rep || b.solved - a.solved)
      .slice(0, 3),
  );

  myRep = computed(() => this.state().entries[this.state().me]?.rep ?? 0);
  mySolved = computed(() => this.state().entries[this.state().me]?.solved ?? 0);

  setMe(name: string) {
    const s = { ...this.state() };
    s.me = name;
    if (!s.entries[name]) s.entries[name] = { name, rep: 0, solved: 0 };
    this.state.set(s);
    this.save();
  }

  hasSolvedToday(gameKey: string): boolean {
    const today = new Date().toISOString().slice(0, 10);
    return this.state().solvedToday[today]?.includes(gameKey) ?? false;
  }

  awardSolve(gameKey: string) {
    const today = new Date().toISOString().slice(0, 10);
    const s = { ...this.state() };
    if (!s.solvedToday[today]) s.solvedToday[today] = [];
    if (s.solvedToday[today].includes(gameKey)) return;
    s.solvedToday[today] = [...s.solvedToday[today], gameKey];

    const meName = s.me || 'You';
    const cur = s.entries[meName] ?? { name: meName, rep: 0, solved: 0 };
    s.entries = {
      ...s.entries,
      [meName]: { ...cur, rep: cur.rep + REP_PER_SOLVE, solved: cur.solved + 1 },
    };
    this.state.set(s);
    this.save();
  }

  private load(): StoredState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return {
      entries: {
        Alex: { name: 'Alex', rep: 18, solved: 6 },
        Priya: { name: 'Priya', rep: 12, solved: 4 },
        Diego: { name: 'Diego', rep: 9, solved: 3 },
        You: { name: 'You', rep: 0, solved: 0 },
      },
      me: 'You',
      solvedToday: {},
    };
  }

  private save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state()));
    } catch {}
  }
}
