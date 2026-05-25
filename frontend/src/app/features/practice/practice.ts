import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { MinigamesService } from '../minigames/minigames.service';

interface DailyQuestion {
  id: number;
  category: string;
  question: string;
  options: string[];
  answer: number;
  explanation: string;
}

const QUESTIONS: DailyQuestion[] = [
  {
    id: 1, category: 'Algorithms',
    question: 'What is the time complexity of binary search on a sorted array?',
    options: ['O(n)', 'O(n²)', 'O(log n)', 'O(1)'],
    answer: 2,
    explanation: 'Binary search halves the search space each step, giving O(log n) time complexity.',
  },
  {
    id: 2, category: 'JavaScript',
    question: 'What does `===` check that `==` does not?',
    options: ['Value only', 'Type only', 'Both value and type', 'Neither'],
    answer: 2,
    explanation: '`===` is strict equality — it checks both value and type without coercion.',
  },
  {
    id: 3, category: 'Networking',
    question: 'Which HTTP status code means "Not Found"?',
    options: ['200', '401', '403', '404'],
    answer: 3,
    explanation: '404 means the requested resource could not be found on the server.',
  },
  {
    id: 4, category: 'Data Structures',
    question: 'Which data structure uses LIFO (Last In, First Out) order?',
    options: ['Queue', 'Stack', 'Linked List', 'Heap'],
    answer: 1,
    explanation: 'A stack is LIFO — the last element pushed is the first one popped.',
  },
  {
    id: 5, category: 'Databases',
    question: 'What does SQL stand for?',
    options: ['Structured Query Language', 'Simple Query Logic', 'Standard Question Language', 'Sequential Queue Language'],
    answer: 0,
    explanation: 'SQL = Structured Query Language, the standard language for relational databases.',
  },
  {
    id: 6, category: 'Web',
    question: 'What does CSS stand for?',
    options: ['Computer Style Sheet', 'Cascading Style Sheets', 'Creative Style Syntax', 'Colorful Style Script'],
    answer: 1,
    explanation: 'CSS = Cascading Style Sheets, used to style HTML documents.',
  },
  {
    id: 7, category: 'Algorithms',
    question: 'What is the worst-case time complexity of QuickSort?',
    options: ['O(n log n)', 'O(n)', 'O(n²)', 'O(log n)'],
    answer: 2,
    explanation: 'QuickSort degrades to O(n²) when the pivot is always the smallest or largest element.',
  },
  {
    id: 8, category: 'JavaScript',
    question: 'What will `typeof null` return in JavaScript?',
    options: ['"null"', '"undefined"', '"object"', '"number"'],
    answer: 2,
    explanation: 'This is a known JavaScript bug — `typeof null` returns "object" due to early implementation quirks.',
  },
  {
    id: 9, category: 'Networking',
    question: 'Which HTTP method is typically used to update a resource?',
    options: ['GET', 'POST', 'PUT', 'DELETE'],
    answer: 2,
    explanation: 'PUT replaces a resource entirely. PATCH is used for partial updates.',
  },
  {
    id: 10, category: 'Data Structures',
    question: 'In a min-heap, where is the smallest element always found?',
    options: ['Last node', 'Root node', 'Left child', 'Right child'],
    answer: 1,
    explanation: 'A min-heap guarantees the minimum element is always at the root.',
  },
  {
    id: 11, category: 'Git',
    question: 'What does `git rebase` do compared to `git merge`?',
    options: [
      'Creates a merge commit',
      'Replays commits on top of another branch for a linear history',
      'Deletes the branch',
      'Reverts the last commit',
    ],
    answer: 1,
    explanation: 'Rebase moves commits onto a new base, keeping history linear. Merge preserves the branch structure with a merge commit.',
  },
  {
    id: 12, category: 'Web',
    question: 'What is the purpose of a CDN?',
    options: [
      'To compress images server-side',
      'To deliver content from servers geographically close to the user',
      'To encrypt database connections',
      'To manage DNS records',
    ],
    answer: 1,
    explanation: 'A CDN (Content Delivery Network) caches content at edge servers worldwide to reduce latency.',
  },
  {
    id: 13, category: 'Algorithms',
    question: 'Which sorting algorithm is stable and has O(n log n) worst case?',
    options: ['QuickSort', 'HeapSort', 'MergeSort', 'BubbleSort'],
    answer: 2,
    explanation: 'MergeSort is stable (preserves order of equal elements) and always runs in O(n log n).',
  },
  {
    id: 14, category: 'JavaScript',
    question: 'What is a closure in JavaScript?',
    options: [
      'A function that closes the browser tab',
      'A function that retains access to its outer scope even after the outer function returns',
      'A method to end a loop early',
      'A way to block async code',
    ],
    answer: 1,
    explanation: 'A closure is a function bundled with its lexical environment — it "closes over" variables from its outer scope.',
  },
  {
    id: 15, category: 'Databases',
    question: 'What is an index in a database?',
    options: [
      'A backup copy of a table',
      'A data structure that speeds up data retrieval',
      'A foreign key constraint',
      'A transaction log',
    ],
    answer: 1,
    explanation: 'An index is a separate data structure (often a B-tree) that speeds up lookups at the cost of additional write overhead.',
  },
  {
    id: 16, category: 'Networking',
    question: 'What does REST stand for?',
    options: [
      'Remote Execution of Structured Tasks',
      'Representational State Transfer',
      'Resource Exchange Standard Type',
      'Reactive Event Streaming Technology',
    ],
    answer: 1,
    explanation: 'REST = Representational State Transfer, an architectural style for distributed hypermedia systems.',
  },
  {
    id: 17, category: 'Git',
    question: 'What command undoes the last commit but keeps the changes staged?',
    options: ['git revert HEAD', 'git reset --hard HEAD~1', 'git reset --soft HEAD~1', 'git checkout HEAD~1'],
    answer: 2,
    explanation: '`git reset --soft HEAD~1` moves HEAD back one commit but leaves the changes staged.',
  },
  {
    id: 18, category: 'Data Structures',
    question: 'What is the average time complexity of a hash table lookup?',
    options: ['O(n)', 'O(log n)', 'O(n²)', 'O(1)'],
    answer: 3,
    explanation: 'Hash tables provide O(1) average-case lookup by computing the key\'s bucket position directly.',
  },
  {
    id: 19, category: 'Web',
    question: 'What does CORS stand for?',
    options: [
      'Cross-Origin Resource Sharing',
      'Client-Only Request System',
      'Cached Object Retrieval Service',
      'Content Origin Restriction Standard',
    ],
    answer: 0,
    explanation: 'CORS = Cross-Origin Resource Sharing, a browser mechanism that controls resource access from different origins.',
  },
  {
    id: 20, category: 'JavaScript',
    question: 'What is the event loop in JavaScript responsible for?',
    options: [
      'Compiling TypeScript to JavaScript',
      'Managing memory allocation',
      'Handling async callbacks by picking from the task queue when the call stack is empty',
      'Blocking the main thread during network requests',
    ],
    answer: 2,
    explanation: 'The event loop continuously checks if the call stack is empty, then processes queued callbacks — enabling non-blocking async code.',
  },
  {
    id: 21, category: 'Algorithms',
    question: 'What technique does dynamic programming use to avoid recomputation?',
    options: ['Recursion without base cases', 'Memoization or tabulation', 'Random sampling', 'Greedy choices'],
    answer: 1,
    explanation: 'DP stores results of overlapping subproblems (memoization = top-down cache, tabulation = bottom-up table) to avoid redundant work.',
  },
  {
    id: 22, category: 'Databases',
    question: 'What does ACID stand for in database transactions?',
    options: [
      'Access, Copy, Insert, Delete',
      'Atomicity, Consistency, Isolation, Durability',
      'Array, Cursor, Index, Data',
      'Abstract, Commit, Iterate, Deploy',
    ],
    answer: 1,
    explanation: 'ACID properties guarantee reliable database transactions even in the case of errors or system failures.',
  },
  {
    id: 23, category: 'Web',
    question: 'Which of these is NOT a valid HTTP method?',
    options: ['PATCH', 'OPTIONS', 'FETCH', 'HEAD'],
    answer: 2,
    explanation: 'FETCH is a browser JavaScript API, not an HTTP method. Valid methods include GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS.',
  },
  {
    id: 24, category: 'JavaScript',
    question: 'What does `Promise.all()` do when one promise rejects?',
    options: [
      'Resolves with the remaining promises',
      'Ignores the rejection and continues',
      'Immediately rejects with that error',
      'Waits for all to settle first',
    ],
    answer: 2,
    explanation: '`Promise.all()` fails fast — if any promise rejects, the whole thing rejects immediately. Use `Promise.allSettled()` if you want all to complete.',
  },
  {
    id: 25, category: 'Networking',
    question: 'What is the difference between TCP and UDP?',
    options: [
      'TCP is faster; UDP is more reliable',
      'TCP guarantees delivery and order; UDP is faster with no guarantee',
      'They are the same protocol',
      'UDP is connection-oriented; TCP is not',
    ],
    answer: 1,
    explanation: 'TCP (Transmission Control Protocol) ensures ordered, reliable delivery. UDP (User Datagram Protocol) is connectionless and faster, used for streaming or gaming.',
  },
  {
    id: 26, category: 'Git',
    question: 'What is the purpose of `.gitignore`?',
    options: [
      'To list collaborators to ignore',
      'To specify files/folders Git should not track',
      'To prevent pushing to main',
      'To configure merge strategies',
    ],
    answer: 1,
    explanation: '`.gitignore` tells Git which files or patterns to exclude from tracking — useful for build outputs, secrets, and node_modules.',
  },
  {
    id: 27, category: 'Data Structures',
    question: 'What is the main difference between a stack and a queue?',
    options: [
      'Stacks allow random access; queues do not',
      'Stacks are LIFO; queues are FIFO',
      'Queues are LIFO; stacks are FIFO',
      'Both are FIFO',
    ],
    answer: 1,
    explanation: 'Stack = LIFO (Last In, First Out). Queue = FIFO (First In, First Out).',
  },
  {
    id: 28, category: 'Algorithms',
    question: 'What does BFS (Breadth-First Search) use internally to track nodes to visit?',
    options: ['Stack', 'Priority Queue', 'Queue', 'Hash Set'],
    answer: 2,
    explanation: 'BFS uses a Queue — it visits nodes level by level, processing the earliest discovered nodes first.',
  },
  {
    id: 29, category: 'Web',
    question: 'What is the purpose of the `<meta charset="UTF-8">` tag in HTML?',
    options: [
      'Sets the page language to English',
      'Declares the character encoding so the browser renders text correctly',
      'Enables Unicode emoji rendering only',
      'Links to an external font',
    ],
    answer: 1,
    explanation: 'The charset meta tag tells the browser which character encoding to use for the page — UTF-8 supports virtually all characters.',
  },
  {
    id: 30, category: 'Databases',
    question: 'What is a foreign key?',
    options: [
      'A key used to encrypt data',
      'A primary key from another table used to link records',
      'An auto-incremented column',
      'A unique identifier within an index',
    ],
    answer: 1,
    explanation: 'A foreign key in one table references the primary key of another, enforcing referential integrity between related tables.',
  },
];

const STORAGE_KEY = 'konkat-daily-q';
const STREAK_KEY  = 'konkat-daily-streak';

function todayKey(): string {
  return new Date().toDateString();
}

function pickQuestion(): DailyQuestion {
  const now = new Date();
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86_400_000
  );
  return QUESTIONS[dayOfYear % QUESTIONS.length];
}

interface StoredAnswer {
  date: string;
  selected: number;
}

interface Streak {
  lastDate: string;
  count: number;
}

@Component({
  selector: 'app-practice',
  standalone: true,
  imports: [],
  templateUrl: './practice.html',
  styleUrl: './practice.css',
})
export class Practice implements OnInit {
  readonly question = pickQuestion();

  private minigames = inject(MinigamesService);

  selected   = signal<number | null>(null);
  revealed   = signal(false);
  streak     = signal(0);
  repAwarded = signal<number | null>(null);

  readonly correct = computed(() => this.selected() === this.question.answer);

  ngOnInit(): void {
    this.loadStreak();
    this.loadSavedAnswer();
  }

  choose(index: number): void {
    if (this.revealed()) return;
    this.selected.set(index);
    this.revealed.set(true);
    this.saveAnswer(index);
    this.updateStreak();

    if (index === this.question.answer && !this.minigames.hasSolvedToday('daily-question')) {
      void this.minigames.awardSolve('daily-question').then(() => {
        this.repAwarded.set(3);
      });
    }
  }

  optionState(index: number): 'default' | 'correct' | 'wrong' | 'missed' {
    if (!this.revealed()) return 'default';
    if (index === this.question.answer) return 'correct';
    if (index === this.selected() && !this.correct()) return 'wrong';
    return 'default';
  }

  private saveAnswer(selected: number): void {
    const data: StoredAnswer = { date: todayKey(), selected };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  private loadSavedAnswer(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data: StoredAnswer = JSON.parse(raw);
      if (data.date === todayKey()) {
        this.selected.set(data.selected);
        this.revealed.set(true);
      }
    } catch { /* ignore */ }
  }

  private loadStreak(): void {
    try {
      const raw = localStorage.getItem(STREAK_KEY);
      if (!raw) return;
      const s: Streak = JSON.parse(raw);
      const today     = todayKey();
      const yesterday = new Date(Date.now() - 86_400_000).toDateString();
      if (s.lastDate === today || s.lastDate === yesterday) {
        this.streak.set(s.count);
      }
    } catch { /* ignore */ }
  }

  private updateStreak(): void {
    const today     = todayKey();
    const yesterday = new Date(Date.now() - 86_400_000).toDateString();
    let count = 1;
    try {
      const raw = localStorage.getItem(STREAK_KEY);
      if (raw) {
        const s: Streak = JSON.parse(raw);
        if (s.lastDate === yesterday) count = s.count + 1;
        else if (s.lastDate === today)  count = s.count;
      }
    } catch { /* ignore */ }
    const newStreak: Streak = { lastDate: today, count };
    localStorage.setItem(STREAK_KEY, JSON.stringify(newStreak));
    this.streak.set(count);
  }
}
