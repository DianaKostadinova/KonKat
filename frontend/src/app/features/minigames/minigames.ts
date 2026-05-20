import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { MinigamesService } from './minigames.service';

interface PinpointPuzzle {
  answer: string;
  clues: string[];
}

interface DatamuseWord {
  word: string;
  score?: number;
}

const WORDLE_MAX_GUESSES = 6;
const WORDLE_LEN = 5;
const PINPOINT_CLUES = 5;

const WORDLE_WORDS = [
  'crane','slate','trace','adieu','audio','raise','arise','stare','snare','share',
  'shore','store','score','scare','spare','stale','scale','shale','shame','shake',
  'shape','shade','shave','shale','brave','grave','graze','grace','grape','grade',
  'grate','great','greet','green','greed','breed','bread','break','bream','dream',
  'dread','tread','treat','trend','blend','bleed','bleak','bleat','clear','clean',
  'cream','creak','cheat','cheap','chest','crest','crisp','crimp','crispy','crush',
  'trust','trail','train','brain','brains','drain','grain','plain','claim','flame',
  'place','plane','plant','plank','blank','black','blade','blast','bland','bland',
  'brand','braid','brace','brown','crown','crowd','croud','cloud','clout','clown',
  'cloth','cloak','clock','block','blown','blood','bloom','broom','brook','brood',
  'flood','floor','floss','flout','float','flock','flick','flair','flame','flare',
  'flake','flank','flask','flash','flesh','fresh','press','dress','cress','stress',
  'bless','chess','guess','truss','trust','dross','gloss','floss','gross','cross',
  'frost','broth','cloth','froth','sloth','truth','youth','south','mouth','shout',
  'stout','scout','snout','about','trout','clout','grout','grout','proud','cloud',
  'found','bound','round','sound','wound','pound','mound','hound','ground','stump',
  'clump','plump','trump','thump','flump','slump','chump','grump','stung','sting',
  'bring','cling','fling','sling','swing','sting','thing','prong','wrong','prawn',
  'drawn','brawn','spawn','swamp','stomp','stamp','tramp','cramp','clamp','champ',
  'stash','crash','clash','flash','gnash','brash','thrash','slash','latch','catch',
  'hatch','match','patch','watch','fetch','retch','sketch','notch','botch','hutch',
  'witch','ditch','pitch','stitch','bunch','hunch','lunch','punch','crunch','munch',
  'perch','merge','verge','forge','gorge','purge','surge','lurge','judge','nudge',
  'budge','fudge','hedge','ledge','wedge','sedge','ridge','bridge','midge','lodge',
  'badge','cadge','cadge','plaid','braid','fraud','creed','freed','greed','treed',
  'kneel','steel','wheel','dweel','steal','squeal','zeal','meal','deal','heal',
  'field','yield','wield','fiend','blend','lend','trend','spend','blend','mend',
  'light','night','sight','tight','right','might','fight','bight','plight','flight',
  'cloth','broth','froth','sloth','troth','worth','forth','north','short','sport',
  'snort','abort','exert','alert','blurt','flirt','shirt','skirt','squirt','spurt',
  'swirl','twirl','whirl','curly','burly','surly','early','pearly','world','swore',
  'shore','score','snore','adore','chore','spore','store','crore','before','ignore',
];

function dailyWord(): string {
  const epoch = new Date('2024-01-01').getTime();
  const day = Math.floor((Date.now() - epoch) / 86400000);
  const idx = day % WORDLE_WORDS.length;
  return WORDLE_WORDS[idx];
}

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
  leaderboard = this.games.leaderboard;

  view = signal<'menu' | 'pinpoint' | 'wordle'>('menu');

  constructor() {
    this.games.loadLeaderboard();
    this.games.loadMyRep();
  }

  // Pinpoint state
  pinpointPuzzle = signal<PinpointPuzzle | null>(null);
  pinpointLoading = signal(false);
  pinpointLoadError = signal('');
  cluesShown = signal(1);
  guess = signal('');
  pinpointStatus = signal<'playing' | 'won' | 'lost'>('playing');
  pinpointSolvedToday = computed(() => this.games.hasSolvedToday('pinpoint'));
  pinpointPlayedToday = computed(() => this.games.hasPlayedToday('pinpoint'));
  visibleClues = computed(() => this.pinpointPuzzle()?.clues.slice(0, this.cluesShown()) ?? []);

  // Wordle state
  private target = signal<string>('');
  wordleStatus = signal<'loading' | 'playing' | 'won' | 'lost' | 'error'>('loading');
  wordleLoadError = signal('');
  wordleSolvedToday = computed(() => this.games.hasSolvedToday('wordle'));
  wordlePlayedToday = computed(() => this.games.hasPlayedToday('wordle'));
  rows = signal<WordleCell[][]>([]);
  current = signal('');
  wordleError = signal('');
  keyboardState = signal<Record<string, LetterState>>({});

  readonly keyboardRows = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACK'],
  ];

  openGame(g: 'pinpoint' | 'wordle') {
    this.view.set(g);
    if (g === 'pinpoint' && !this.pinpointPuzzle()) this.loadPinpoint();
    if (g === 'wordle' && !this.target()) this.loadWordle();
  }

  backToMenu() {
    this.view.set('menu');
  }

  /* ── Pinpoint ───────────────────────────────────────────── */
  async loadPinpoint() {
    this.pinpointLoading.set(true);
    this.pinpointLoadError.set('');
    this.cluesShown.set(1);
    this.guess.set('');
    this.pinpointStatus.set('playing');

    const epoch = new Date('2024-01-01').getTime();
    const day = Math.floor((Date.now() - epoch) / 86400000);
    // Try words starting from today's offset until one has enough clues
    for (let i = 0; i < WORDLE_WORDS.length; i++) {
      const answer = WORDLE_WORDS[(day + i) % WORDLE_WORDS.length];
      try {
        const clues = await this.fetchClues(answer);
        if (clues.length >= PINPOINT_CLUES) {
          this.pinpointPuzzle.set({ answer, clues: clues.slice(0, PINPOINT_CLUES) });
          this.pinpointLoading.set(false);
          return;
        }
      } catch {}
    }
    this.pinpointLoadError.set('Could not generate a puzzle. Try again.');
    this.pinpointLoading.set(false);
  }

  private async fetchClues(word: string): Promise<string[]> {
    try {
      const res = await firstValueFrom(
        this.http.get<DatamuseWord[]>(
          `https://api.datamuse.com/words?rel_trg=${encodeURIComponent(word)}&max=20`,
        ),
      );
      const clues = (res ?? [])
        .map((d) => d.word)
        .filter((w) => /^[a-zA-Z][a-zA-Z\- ]{1,20}$/.test(w))
        .filter((w) => !w.toLowerCase().includes(word.toLowerCase()))
        .filter((w) => !word.toLowerCase().includes(w.toLowerCase()))
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1));
      return Array.from(new Set(clues));
    } catch {
      return [];
    }
  }

  onGuessInput(e: Event) {
    this.guess.set((e.target as HTMLInputElement).value);
  }

  submitPinpoint() {
    const puzzle = this.pinpointPuzzle();
    if (!puzzle || this.pinpointStatus() !== 'playing') return;
    const ok = this.guess().trim().toLowerCase() === puzzle.answer.toLowerCase();
    if (ok) {
      this.pinpointStatus.set('won');
      this.games.markPlayed('pinpoint');
      if (!this.pinpointSolvedToday()) this.games.awardSolve('pinpoint');
      return;
    }
    if (this.cluesShown() >= puzzle.clues.length) {
      this.pinpointStatus.set('lost');
      this.games.markPlayed('pinpoint');
      return;
    }
    this.cluesShown.update((n) => n + 1);
    this.guess.set('');
  }

  nextPinpoint() {
    if (this.pinpointPlayedToday()) return;
    this.pinpointPuzzle.set(null);
    this.loadPinpoint();
  }

  /* ── Wordle ─────────────────────────────────────────────── */
  loadWordle() {
    this.rows.set([]);
    this.current.set('');
    this.wordleError.set('');
    this.keyboardState.set({});
    this.target.set(dailyWord());
    this.wordleStatus.set('playing');
  }

  private async isValidWord(word: string): Promise<boolean> {
    if (WORDLE_WORDS.includes(word)) return true;
    try {
      await firstValueFrom(
        this.http.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`),
      );
      return true;
    } catch {
      return false;
    }
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(e: KeyboardEvent) {
    if (this.view() !== 'wordle') return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Enter') this.pressKey('ENTER');
    else if (e.key === 'Backspace') this.pressKey('BACK');
    else if (/^[a-zA-Z]$/.test(e.key)) this.pressKey(e.key.toUpperCase());
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
      this.games.markPlayed('wordle');
      if (!this.wordleSolvedToday()) this.games.awardSolve('wordle');
      return;
    }
    if (this.rows().length >= WORDLE_MAX_GUESSES) {
      this.wordleStatus.set('lost');
      this.games.markPlayed('wordle');
    }
  }

  private scoreGuess(guess: string, target: string): WordleCell[] {
    const result: WordleCell[] = Array.from({ length: WORDLE_LEN }, (_, i) => ({
      letter: guess[i],
      state: 'miss',
    }));
    const targetChars = target.split('');
    const used = new Array(WORDLE_LEN).fill(false);

    for (let i = 0; i < WORDLE_LEN; i++) {
      if (guess[i] === targetChars[i]) {
        result[i].state = 'hit';
        used[i] = true;
      }
    }
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
