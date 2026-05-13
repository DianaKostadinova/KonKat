import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { signal } from '@angular/core';
import { QAService } from './qa.service';
import { AuthService } from '../../shared/auth/auth.service';
import { QAQuestion } from './qa.model';

const API = 'http://localhost:8082/api';

const mockUser = signal<any>({ id: 'clerk_1', name: 'TestUser', email: 'test@test.com', dbId: 1 });
const mockIsLoggedIn = signal(false);

const mockAuthService = {
  user: mockUser.asReadonly(),
  isLoggedIn: mockIsLoggedIn.asReadonly(),
  ready: signal(true).asReadonly(),
  getToken: () => Promise.resolve(null),
};

function makeQuestion(overrides: Partial<QAQuestion> = {}): QAQuestion {
  return {
    id: 1,
    author: { id: 1, name: 'Alice' },
    title: 'How to test Angular?',
    content: 'Looking for best practices.',
    tags: ['angular', 'testing'],
    votes: 0,
    userVote: null,
    views: 0,
    answers: [],
    answerCount: 0,
    solved: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('QAService', () => {
  let service: QAService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: mockAuthService },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    service = TestBed.inject(QAService);
    // Flush the initial load() triggered by the constructor
    httpMock.expectOne(`${API}/questions`).flush([makeQuestion()]);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('populates questions from the initial load', () => {
    expect(service.questions().length).toBe(1);
    expect(service.questions()[0].title).toBe('How to test Angular?');
  });

  // ── createQuestion ─────────────────────────────────────────────────────

  describe('createQuestion', () => {
    const newData = {
      title: 'What is a signal?',
      content: 'Explain Angular signals.',
      tags: ['angular', 'signals'],
    };

    it('adds an optimistic entry with a negative id immediately', () => {
      service.createQuestion(newData);
      const questions = service.questions();
      expect(questions.length).toBe(2);
      expect(questions[0].id).toBeLessThan(0);
      expect(questions[0].title).toBe('What is a signal?');
      // Flush to keep httpMock clean
      httpMock.expectOne(`${API}/questions`).flush(makeQuestion({ id: 50, title: 'What is a signal?' }));
    });

    it('replaces the optimistic entry with the server response', () => {
      service.createQuestion(newData);
      const tempId = service.questions()[0].id;
      expect(tempId).toBeLessThan(0);

      httpMock.expectOne(`${API}/questions`).flush(makeQuestion({ id: 50, title: 'What is a signal?' }));

      const questions = service.questions();
      expect(questions.find(q => q.id === tempId)).toBeUndefined();
      expect(questions.find(q => q.id === 50)?.title).toBe('What is a signal?');
    });

    it('removes the optimistic entry on server error', () => {
      service.createQuestion(newData);
      expect(service.questions().length).toBe(2);

      httpMock.expectOne(`${API}/questions`).flush(null);

      expect(service.questions().length).toBe(1);
    });

    it('sets votes=0 and solved=false on the optimistic entry', () => {
      service.createQuestion(newData);
      const temp = service.questions()[0];
      expect(temp.votes).toBe(0);
      expect(temp.solved).toBe(false);
      expect(temp.answerCount).toBe(0);
      httpMock.expectOne(`${API}/questions`).flush(makeQuestion({ id: 51 }));
    });
  });

  // ── addAnswer ──────────────────────────────────────────────────────────

  describe('addAnswer', () => {
    const answerData = { content: 'Signals are reactive primitives.' };

    it('adds an optimistic answer with a negative id immediately', () => {
      service.addAnswer(1, answerData);
      const q = service.questions()[0];
      expect(q.answers.length).toBe(1);
      expect(q.answers[0].id).toBeLessThan(0);
      expect(q.answerCount).toBe(1);
      httpMock.expectOne(`${API}/questions/1/answers`).flush({
        id: 100, author: { id: 1, name: 'TestUser' }, content: answerData.content,
        votes: 0, userVote: null, isAccepted: false, createdAt: new Date().toISOString(),
      });
    });

    it('replaces the optimistic answer with the server response', () => {
      service.addAnswer(1, answerData);
      const tempId = service.questions()[0].answers[0].id;

      httpMock.expectOne(`${API}/questions/1/answers`).flush({
        id: 100, author: { id: 1, name: 'TestUser' }, content: answerData.content,
        votes: 0, userVote: null, isAccepted: false, createdAt: new Date().toISOString(),
      });

      const q = service.questions()[0];
      expect(q.answers.find(a => a.id === tempId)).toBeUndefined();
      expect(q.answers.find(a => a.id === 100)?.content).toBe('Signals are reactive primitives.');
    });

    it('removes the optimistic answer and decrements answerCount on error', () => {
      service.addAnswer(1, answerData);
      expect(service.questions()[0].answers.length).toBe(1);
      expect(service.questions()[0].answerCount).toBe(1);

      httpMock.expectOne(`${API}/questions/1/answers`).flush(null);

      const q = service.questions()[0];
      expect(q.answers.length).toBe(0);
      expect(q.answerCount).toBe(0);
    });
  });

  // ── voteQuestion ───────────────────────────────────────────────────────

  describe('voteQuestion', () => {
    it('updates votes and userVote from the server response', () => {
      service.voteQuestion(1, 'UP');
      httpMock.expectOne(`${API}/questions/1/vote`).flush({ votes: 1, userVote: 'UP' });
      expect(service.questions()[0].votes).toBe(1);
      expect(service.questions()[0].userVote).toBe('UP');
    });

    it('handles downvote correctly', () => {
      service.voteQuestion(1, 'DOWN');
      httpMock.expectOne(`${API}/questions/1/vote`).flush({ votes: -1, userVote: 'DOWN' });
      expect(service.questions()[0].votes).toBe(-1);
      expect(service.questions()[0].userVote).toBe('DOWN');
    });
  });

  // ── acceptAnswer ───────────────────────────────────────────────────────

  describe('acceptAnswer', () => {
    it('marks the question as solved and sets isAccepted on the answer', () => {
      const answer = {
        id: 200, author: { id: 2, name: 'Bob' }, content: 'Great answer',
        votes: 0, userVote: null, isAccepted: false, createdAt: new Date().toISOString(),
      };
      service['_questions'].update(qs => qs.map(q => ({ ...q, answers: [answer] })));

      service.acceptAnswer(1, 200);
      httpMock.expectOne(`${API}/questions/1/answers/200/accept`).flush({ ...answer, isAccepted: true });

      const q = service.questions()[0];
      expect(q.solved).toBe(true);
      expect(q.answers[0].isAccepted).toBe(true);
    });
  });

  // ── loading signal ─────────────────────────────────────────────────────

  describe('loading signal', () => {
    it('is false after initial load completes', () => {
      expect(service.loading()).toBe(false);
    });

    it('is true while load() is pending', () => {
      service.load();
      expect(service.loading()).toBe(true);
      httpMock.expectOne(`${API}/questions`).flush([]);
      expect(service.loading()).toBe(false);
    });
  });
});
