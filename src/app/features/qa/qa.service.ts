import { Injectable, signal} from '@angular/core'
import {QAPost, QAComment} from './qa.model';

@Injectable({providedIn: 'root'})
export class QAService {
  private posts = signal<QAPost[]>([
    {
      id: 1,
      author: { name: 'Viktor Risteski', role: 'Backend Engineer' },
      title: 'How do I properly handle JWT refresh tokens in Angular?',
      content: 'I have an Angular app with JWT auth. The access token expires every 15 minutes. I want to automatically refresh it using the refresh token without the user noticing. What is the best approach using HTTP interceptors?',
      code: {
        language: 'typescript',
        snippet: `intercept(req: HttpRequest<any>, next: HttpHandler) {
  return next.handle(req).pipe(
    catchError(err => {
      if (err.status === 401) {
        // How do I refresh here and retry?
      }
      return throwError(() => err);
    })
  );
}`
      },
      tags: ['angular', 'jwt', 'auth', 'interceptor'],
      votes: 14,
      views: 142,
      solved: true,
      createdAt: '3h ago',
      comments: [
        {
          id: 1,
          author: { name: 'Ana Jovanovska', role: 'Fullstack Dev' },
          content: 'You need to use a BehaviorSubject to queue requests while refreshing. When a 401 hits, check if refresh is already in progress — if yes, queue the request; if no, start the refresh.',
          code: {
            language: 'typescript',
            snippet: `private refreshing = false;
private tokenSubject = new BehaviorSubject<string | null>(null);

intercept(req: HttpRequest<any>, next: HttpHandler) {
  return next.handle(req).pipe(
    catchError(err => {
      if (err.status === 401 && !this.refreshing) {
        this.refreshing = true;
        return this.authService.refreshToken().pipe(
          switchMap(token => {
            this.refreshing = false;
            this.tokenSubject.next(token);
            return next.handle(this.addToken(req, token));
          })
        );
      }
      return this.tokenSubject.pipe(
        filter(t => t !== null), take(1),
        switchMap(token => next.handle(this.addToken(req, token!)))
      );
    })
  );
}`
          },
          votes: 18,
          voted: null,
          isAccepted: true,
          createdAt: '2h ago',
        },
        {
          id: 2,
          author: { name: 'Marko Dimitrovski', role: 'DevOps Engineer' },
          content: 'Also consider storing refresh tokens in httpOnly cookies instead of localStorage to prevent XSS attacks. The interceptor approach Ana described is correct.',
          votes: 7,
          voted: null,
          createdAt: '1h ago',
        },
      ],
    },
    {
      id: 2,
      author: { name: 'Sara Blazevska', role: 'UI/UX Designer' },
      title: 'CSS Grid vs Flexbox — when should I use which?',
      content: 'I keep going back and forth between CSS Grid and Flexbox. I understand the basics but I am not sure when to use one over the other. Can someone explain with practical examples?',
      tags: ['css', 'flexbox', 'grid', 'layout'],
      votes: 22,
      views: 310,
      solved: false,
      createdAt: '1d ago',
      comments: [
        {
          id: 3,
          author: { name: 'Nikola Georgievski', role: 'Frontend Dev' },
          content: 'Simple rule: Flexbox for 1D layouts (row OR column), Grid for 2D layouts (rows AND columns). Nav bar? Flexbox. Full page layout with sidebar? Grid. Card grid? Grid. Buttons in a row? Flexbox.',
          votes: 31,
          voted: null,
          createdAt: '20h ago',
        },
        {
          id: 4,
          author: { name: 'Elena Petrovska', role: 'Mobile Dev' },
          content: 'They also work great together — Grid for the macro layout, Flexbox for components inside grid cells. Do not think of them as alternatives.',
          votes: 12,
          voted: null,
          createdAt: '18h ago',
        },
      ],
    },
    {
      id: 3,
      author: { name: 'Petar Stojanovski', role: 'Systems Engineer' },
      title: 'Docker container keeps restarting — exit code 137',
      content: 'My Node.js Docker container keeps restarting with exit code 137. The logs show the app starts fine then dies after a few seconds. Running on a 512MB VPS.',
      code: {
        language: 'yaml',
        snippet: `services:
  app:
    image: my-node-app
    restart: always
    mem_limit: 512m
    environment:
      - NODE_ENV=production`
      },
      tags: ['docker', 'nodejs', 'devops', 'memory'],
      votes: 8,
      views: 89,
      solved: true,
      createdAt: '2d ago',
      comments: [
        {
          id: 5,
          author: { name: 'Marko Dimitrovski', role: 'DevOps Engineer' },
          content: 'Exit code 137 means OOM kill — your container is running out of memory. Node.js by default uses up to 1.5GB heap. Set --max-old-space-size to limit it.',
          code: {
            language: 'dockerfile',
            snippet: `CMD ["node", "--max-old-space-size=256", "server.js"]`
          },
          votes: 15,
          voted: null,
          isAccepted: true,
          createdAt: '1d ago',
        },
      ],
    },
  ])
  getAll() {return this.posts();}

  votePost(postId: number, direction: 'up' | 'down') {
    this.posts.update(posts => posts.map(p => {
      if (p.id !== postId) return p;
      const prev = p.voted;
      if (prev === direction) return { ...p, voted: null, votes: p.votes + (direction === 'up' ? -1 : 1) };
      const delta = direction === 'up' ? 1 : -1;
      const undo = prev ? (prev === 'up' ? -1 : 1) : 0;
      return { ...p, voted: direction, votes: p.votes + delta + undo };
    }));
  }
  voteComment(postId: number, commentId: number, direction: 'up' | 'down') {
    this.posts.update(posts => posts.map(p => {
      if (p.id !== postId) return p;
      return {
        ...p,
        comments: p.comments.map(c => {
          if (c.id !== commentId) return c;
          const prev = c.voted;
          if (prev === direction) return { ...c, voted: null, votes: c.votes + (direction === 'up' ? -1 : 1) };
          const delta = direction === 'up' ? 1 : -1;
          const undo = prev ? (prev === 'up' ? -1 : 1) : 0;
          return { ...c, voted: direction, votes: c.votes + delta + undo };
        })
      };
    }));
  }
  addComment(postId: number, content: string) {
    this.posts.update(posts => posts.map(p => {
      if (p.id !== postId) return p;
      const newComment: QAComment = {
        id: Date.now(),
        author: { name: 'You', role: 'Developer' },
        content,
        votes: 0,
        voted: null,
        createdAt: 'just now',
      };
      return { ...p, comments: [...p.comments, newComment] };
    }));
  }
}
