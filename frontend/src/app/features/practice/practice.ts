import { Component, signal, computed, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface Problem {
  id: number;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  tags: string[];
  solved?: boolean;
  attempted?: boolean;
}

interface TestResult {
  label: string;
  input: string;
  expected: string;
  got: string;
  passed: boolean;
  runtime?: string;
}

interface HintMessage {
  role: 'user' | 'ai';
  content: string;
}

const PROBLEMS: Problem[] = [
  { id: 1,  title: 'Two Sum',                difficulty: 'Easy',   tags: ['Array', 'Hash Table'],          solved: true      },
  { id: 2,  title: 'Valid Parentheses',       difficulty: 'Easy',   tags: ['Stack', 'String'],              attempted: true   },
  { id: 3,  title: 'Maximum Subarray',        difficulty: 'Medium', tags: ['Array', 'Dynamic Programming']                    },
  { id: 4,  title: 'Binary Search',           difficulty: 'Easy',   tags: ['Array', 'Binary Search'],       solved: true      },
  { id: 5,  title: 'Merge Two Sorted Lists',  difficulty: 'Easy',   tags: ['Linked List', 'Recursion']                        },
  { id: 6,  title: 'Climbing Stairs',         difficulty: 'Easy',   tags: ['Dynamic Programming', 'Math']                     },
  { id: 7,  title: 'Number of Islands',       difficulty: 'Medium', tags: ['BFS', 'DFS', 'Grid']                              },
  { id: 8,  title: 'Merge Intervals',         difficulty: 'Medium', tags: ['Array', 'Sorting']                                },
  { id: 9,  title: 'Word Search',             difficulty: 'Medium', tags: ['Backtracking', 'Grid']                            },
  { id: 10, title: 'Coin Change',             difficulty: 'Medium', tags: ['Dynamic Programming', 'BFS']                      },
  { id: 11, title: 'Trapping Rain Water',     difficulty: 'Hard',   tags: ['Array', 'Two Pointers', 'Stack']                  },
  { id: 12, title: 'LRU Cache',               difficulty: 'Hard',   tags: ['Design', 'Hash Table', 'Linked List']             },
];

const STARTER: Record<string, string> = {
  python: `from typing import List

class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        seen = {}
        for i, n in enumerate(nums):
            diff = target - n
            if diff in seen:
                return [seen[diff], i]
            seen[n] = i
        return []
`,
  javascript: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
var twoSum = function(nums, target) {
    const seen = {};
    for (let i = 0; i < nums.length; i++) {
        const diff = target - nums[i];
        if (diff in seen) return [seen[diff], i];
        seen[nums[i]] = i;
    }
    return [];
};
`,
  kotlin: `class Solution {
    fun twoSum(nums: IntArray, target: Int): IntArray {
        val seen = mutableMapOf<Int, Int>()
        for ((i, n) in nums.withIndex()) {
            val diff = target - n
            if (diff in seen) return intArrayOf(seen[diff]!!, i)
            seen[n] = i
        }
        return intArrayOf()
    }
}
`,
  java: `class Solution {
    public int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> seen = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int diff = target - nums[i];
            if (seen.containsKey(diff)) return new int[]{seen.get(diff), i};
            seen.put(nums[i], i);
        }
        return new int[]{};
    }
}
`,
};

const MOCK_RESULTS: TestResult[] = [
  { label: 'Case 1', input: 'nums = [2,7,11,15], target = 9',  expected: '[0,1]', got: '[0,1]', passed: true,  runtime: '1ms' },
  { label: 'Case 2', input: 'nums = [3,2,4],     target = 6',  expected: '[1,2]', got: '[1,2]', passed: true,  runtime: '1ms' },
  { label: 'Case 3', input: 'nums = [3,3],        target = 6',  expected: '[0,1]', got: '[0,1]', passed: true,  runtime: '0ms' },
];

const MOCK_HINTS: HintMessage[] = [
  {
    role: 'ai',
    content: "Hey! 👋 I'm your coding mentor. I won't give you the answer, but I'll guide you in the right direction. What have you tried so far, or where are you stuck?",
  },
];

@Component({
  selector: 'app-practice',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './practice.html',
  styleUrl: './practice.css',
})
export class Practice implements AfterViewChecked {
  @ViewChild('hintScroll') hintScrollEl?: ElementRef<HTMLElement>;

  readonly problems = PROBLEMS;

  selectedId    = signal(1);
  diffFilter    = signal<'All' | 'Easy' | 'Medium' | 'Hard'>('All');
  rightTab      = signal<'problem' | 'hints'>('problem');
  language      = signal('python');
  code          = signal(STARTER['python']);
  runStatus     = signal<'idle' | 'running' | 'done'>('idle');
  runResults    = signal<TestResult[]>([]);
  submitStatus  = signal<'idle' | 'running' | 'accepted' | 'wrong'>('idle');
  hintMessages  = signal<HintMessage[]>(MOCK_HINTS);
  hintInput     = signal('');
  hintThinking  = signal(false);
  shouldScrollHints = false;

  readonly languages = ['python', 'javascript', 'kotlin', 'java'];

  readonly filtered = computed(() => {
    const f = this.diffFilter();
    return this.problems.filter(p => f === 'All' || p.difficulty === f);
  });

  readonly selected = computed(() =>
    this.problems.find(p => p.id === this.selectedId())!
  );

  readonly passCount = computed(() =>
    this.runResults().filter(r => r.passed).length
  );

  selectProblem(id: number) {
    this.selectedId.set(id);
    this.runStatus.set('idle');
    this.submitStatus.set('idle');
    this.runResults.set([]);
    this.rightTab.set('problem');
  }

  setLanguage(lang: string) {
    this.language.set(lang);
    this.code.set(STARTER[lang] ?? '');
  }

  run() {
    if (this.runStatus() === 'running') return;
    this.runStatus.set('running');
    this.runResults.set([]);
    this.submitStatus.set('idle');
    setTimeout(() => {
      this.runStatus.set('done');
      this.runResults.set(MOCK_RESULTS);
    }, 1400);
  }

  submit() {
    if (this.submitStatus() === 'running') return;
    this.submitStatus.set('running');
    this.runStatus.set('idle');
    setTimeout(() => {
      this.submitStatus.set('accepted');
    }, 2000);
  }

  resetCode() {
    this.code.set(STARTER[this.language()] ?? '');
    this.runStatus.set('idle');
    this.runResults.set([]);
    this.submitStatus.set('idle');
  }

  sendHint() {
    const q = this.hintInput().trim();
    if (!q || this.hintThinking()) return;

    this.hintMessages.update(m => [...m, { role: 'user', content: q }]);
    this.hintInput.set('');
    this.hintThinking.set(true);
    this.shouldScrollHints = true;

    setTimeout(() => {
      this.hintMessages.update(m => [...m, {
        role: 'ai',
        content: this.mockAiReply(q),
      }]);
      this.hintThinking.set(false);
      this.shouldScrollHints = true;
    }, 1200);
  }

  onHintKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.sendHint(); }
  }

  ngAfterViewChecked() {
    if (this.shouldScrollHints && this.hintScrollEl) {
      const el = this.hintScrollEl.nativeElement;
      el.scrollTop = el.scrollHeight;
      this.shouldScrollHints = false;
    }
  }

  diffColor(d: string): string {
    return d === 'Easy' ? '#10b981' : d === 'Medium' ? '#f59e0b' : '#ef4444';
  }

  private mockAiReply(q: string): string {
    const lower = q.toLowerCase();
    if (lower.includes('brute') || lower.includes('naive') || lower.includes('force'))
      return "Good thinking! The brute-force is O(n²) — two nested loops checking every pair. That's fine as a starting point. Can you see any redundant work being done? Is there a way to answer 'does the complement exist?' without scanning the whole array again?";
    if (lower.includes('hash') || lower.includes('map') || lower.includes('dict'))
      return "You're on the right track! A hash map lets you do lookups in O(1). Think about what you want to store as the key and what as the value. After you store a number, what should you be checking before adding the next one?";
    if (lower.includes('time') || lower.includes('complex') || lower.includes('o(n'))
      return "For Two Sum, can you do better than O(n²)? Think about what data structure gives you O(1) average lookups. If you process each element once and ask 'have I seen what I need before?', what does your time complexity become?";
    if (lower.includes('why') || lower.includes('explain'))
      return "Great question — let me flip it back to you. For each number `n`, you need another number that equals `target - n`. Instead of looking ahead in the array, what if you kept track of numbers you've already seen? How would you store them so you can check quickly?";
    return "Interesting! Try breaking the problem down: for each element, what exactly are you looking for? And once you know what you need, how can you find out if it already exists in the array — without scanning from the beginning each time?";
  }
}
