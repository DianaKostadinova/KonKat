import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { MinigamesService } from './minigames.service';

interface PinpointPuzzle {
  answer: string;
  clues: string[];
}

const PINPOINT_PUZZLES: PinpointPuzzle[] = [
  { answer: 'Angular', clues: ['Framework', 'Google', 'TypeScript', 'Signals', 'Directives'] },
  { answer: 'Coffee', clues: ['Bean', 'Brew', 'Morning', 'Caffeine', 'Espresso'] },
  { answer: 'Ocean', clues: ['Salt', 'Waves', 'Deep', 'Blue', 'Pacific'] },
  { answer: 'Piano', clues: ['Keys', 'Black', 'White', 'Pedal', 'Concert'] },
  { answer: 'Mountain', clues: ['Peak', 'Snow', 'Climb', 'Everest', 'Range'] },
];

const FALLBACK_WORDS = [
  'crane', 'plant', 'brave', 'flame', 'globe', 'mango', 'pixel', 'route',
  'sword', 'tiger', 'video', 'whale', 'yacht', 'zebra', 'cloud', 'drift',
];

const WORDLE_MAX_GUESSES = 6;
const WORDLE_LEN = 5;

type LetterState = 'hit' | 'present' | 'miss' | 'empty';

interface WordleCell {
  letter: string;
  state: LetterState;
}

@Component({
  selector: 'app-minigames',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './minigames.html',
  styleUrl: './minigames.css',
})
export class Minigames {
  private games = inject(MinigamesService);
  private http = inject(HttpClient);

  rep = this.games.myRep;
  solved = this.games.mySolved;
  leaderboard = this.games.leaderboard;

  // Pinpoint state
  private puzzleIdx = signal(Math.floor(Math.random() * PINPOINT_PUZZLES.length));
  cluesShown = signal(1);
  guess = signal('');
  pinpointStatus = signal<'playing' | 'won' | 'lost'>('playing');
  pinpointSolvedToday = computed(() => this.games.hasSolvedToday('pinpoint'));
  puzzle = computed(() => PINPOINT_PUZZLES[this.puzzleIdx()]);
  visibleClues = computed(() => this.puzzle().clues.slice(0, this.cluesShown()));

  // Wordle state
  private target = signal<string>('');
  wordleStatus = signal<'loading' | 'playing' | 'won' | 'lost'>('loading');
  wordleSolvedToday = computed(() => this.games.hasSolvedToday('wordle'));
  rows = signal<WordleCell[][]>([]);
  current = signal('');
  wordleError = signal('');
  keyboardState = signal<Record<string, LetterState>>({});

  readonly keyboardRows = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACK'],
  ];

  constructor() {
    this.loadWordle();
  }

  /* ── Pinpoint ───────────────────────────────────────────── */
  onGuessInput(e: Event) {
    this.guess.set((e.target as HTMLInputElement).value);
  }

  submitPinpoint() {
    if (this.pinpointStatus() !== 'playing') return;
    const ok = this.guess().trim().toLowerCase() === this.puzzle().answer.toLowerCase();
    if (ok) {
      this.pinpointStatus.set('won');
      if (!this.pinpointSolvedToday()) this.games.awardSolve('pinpoint');
      return;
    }
    if (this.cluesShown() >= this.puzzle().clues.length) {
      this.pinpointStatus.set('lost');
      return;
    }
    this.cluesShown.update((n) => n + 1);
    this.guess.set('');
  }

  nextPinpoint() {
    this.puzzleIdx.set((this.puzzleIdx() + 1) % PINPOINT_PUZZLES.length);
    this.cluesShown.set(1);
    this.guess.set('');
    this.pinpointStatus.set('playing');
  }

  /* ── Wordle ─────────────────────────────────────────────── */
  async loadWordle() {
    this.wordleStatus.set('loading');
    this.rows.set([]);
    this.current.set('');
    this.wordleError.set('');
    this.keyboardState.set({});

    const word = await this.fetchTargetWord();
    this.target.set(word);
    this.wordleStatus.set('playing');
  }

  private async fetchTargetWord(): Promise<string> {
    try {
      const res = await firstValueFrom(
        this.http.get<string[]>('https://random-word-api.herokuapp.com/word?length=5'),
      );
      if (Array.isArray(res) && res[0] && /^[a-zA-Z]{5}$/.test(res[0])) {
        return res[0].toLowerCase();
      }
    } catch {}
    return FALLBACK_WORDS[Math.floor(Math.random() * FALLBACK_WORDS.length)];
  }

  private async isValidWord(word: string): Promise<boolean> {
    try {
      await firstValueFrom(
        this.http.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`),
      );
      return true;
    } catch {
      return false;
    }
  }

  pressKey(key: string) {
    if (this.wordleStatus() !== 'playing') return;
    this.wordleError.set('');
    if (key === 'ENTER') {
      this.submitWordle();
    } else if (key === 'BACK') {
      this.current.update((c) => c.slice(0, -1));
    } else if (/^[A-Z]$/.test(key) && this.current().length < WORDLE_LEN) {
      this.current.update((c) => c + key.toLowerCase());
    }
  }

  async submitWordle() {
    const guess = this.current();
    if (guess.length !== WORDLE_LEN) {
      this.wordleError.set('Need 5 letters');
      return;
    }

    const valid = await this.isValidWord(guess);
    if (!valid) {
      this.wordleError.set('Not in word list');
      return;
    }

    const row = this.scoreGuess(guess, this.target());
    this.rows.update((rs) => [...rs, row]);
    this.updateKeyboard(row);
    this.current.set('');

    if (guess === this.target()) {
      this.wordleStatus.set('won');
      if (!this.wordleSolvedToday()) this.games.awardSolve('wordle');
      return;
    }
    if (this.rows().length >= WORDLE_MAX_GUESSES) {
      this.wordleStatus.set('lost');
    }
  }

  private scoreGuess(guess: string, target: string): WordleCell[] {
    const result: WordleCell[] = Array.from({ length: WORDLE_LEN }, (_, i) => ({
      letter: guess[i],
      state: 'miss',
    }));
    const targetChars = target.split('');
    const used = new Array(WORDLE_LEN).fill(false);

    // Pass 1: exact matches
    for (let i = 0; i < WORDLE_LEN; i++) {
      if (guess[i] === targetChars[i]) {
        result[i].state = 'hit';
        used[i] = true;
      }
    }
    // Pass 2: present-but-misplaced
    for (let i = 0; i < WORDLE_LEN; i++) {
      if (result[i].state === 'hit') continue;
      const idx = targetChars.findIndex((c, j) => !used[j] && c === guess[i]);
      if (idx !== -1) {
        result[i].state = 'present';
        used[idx] = true;
      }
    }
    return result;
  }

  private updateKeyboard(row: WordleCell[]) {
    const next = { ...this.keyboardState() };
    const rank: Record<LetterState, number> = { empty: 0, miss: 1, present: 2, hit: 3 };
    for (const cell of row) {
      const key = cell.letter.toUpperCase();
      const prev = next[key] ?? 'empty';
      if (rank[cell.state] > rank[prev]) next[key] = cell.state;
    }
    this.keyboardState.set(next);
  }

  keyState(k: string): LetterState | '' {
    if (k === 'ENTER' || k === 'BACK') return '';
    return this.keyboardState()[k] ?? '';
  }

  emptyRow(idx: number): WordleCell[] {
    const filled = this.rows()[idx];
    if (filled) return filled;
    const isCurrent = idx === this.rows().length;
    const cur = this.current();
    return Array.from({ length: WORDLE_LEN }, (_, i) => ({
      letter: isCurrent ? cur[i] ?? '' : '',
      state: 'empty',
    }));
  }

  get allRows(): number[] {
    return Array.from({ length: WORDLE_MAX_GUESSES }, (_, i) => i);
  }

  revealTarget(): string {
    return this.target().toUpperCase();
  }
}
