import { Injectable, signal } from '@angular/core';
import { Post } from './post.model';

@Injectable({ providedIn: 'root' })
export class PostService {

  private posts = signal<Post[]>([
    {
      id: 1,
      author: { name: 'Ana Jovanovska', role: 'Fullstack Dev', location: 'Skopje', time: '2h ago', badge: 'PRO' },
      type: 'code',
      content: 'Optimized our auth middleware. Replaced old JWT approach with a cleaner interceptor solution!',
      code: {
        language: 'typescript',
        snippet: `@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler) {
    const token = localStorage.getItem('token');
    if (token) {
      const cloned = req.clone({
        headers: req.headers.set('Authorization', \`Bearer \${token}\`)
      });
      return next.handle(cloned);
    }
    return next.handle(req);
  }
}`
      },
      tags: ['#angular', '#typescript', '#auth'],
      reactions: { likes: 48, comments: 12, shares: 6 },
      liked: false,
    },
    {
      id: 2,
      author: { name: 'Viktor Risteski', role: 'Backend Engineer', location: 'Bitola', time: '4h ago' },
      type: 'code',
      content: 'Cracked the matching algorithm using HashMaps. O(n) instead of O(n²)!',
      code: {
        language: 'typescript',
        snippet: `function matchUsers(users: User[]): Match[] {
  const map = new Map<string, User>();
  return users.reduce((matches, user) => {
    const key = user.skills.sort().join('-');
    if (map.has(key)) {
      matches.push({ userA: map.get(key)!, userB: user });
      map.delete(key);
    } else {
      map.set(key, user);
    }
    return matches;
  }, [] as Match[]);
}`
      },
      tags: ['#algorithms', '#typescript'],
      reactions: { likes: 31, comments: 9, shares: 4 },
      liked: false,
    },
    {
      id: 3,
      author: { name: 'Marko Dimitrovski', role: 'DevOps Engineer', location: 'Ohrid', time: '1d ago', badge: 'NEW' },
      type: 'code',
      content: 'Simple GitHub Actions workflow that covers 90% of use cases. Stop overcomplicating CI/CD!',
      code: {
        language: 'yaml',
        snippet: `name: CI/CD Pipeline
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run build
  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - run: npm run deploy`
      },
      tags: ['#devops', '#cicd', '#githubactions'],
      reactions: { likes: 127, comments: 41, shares: 22 },
      liked: false,
    },
  ]);

  getPosts() {
    return this.posts();
  }

  addPost(postData: Omit<Post, 'id'>) {
    const id = Date.now();
    this.posts.update(posts => [{ id, ...postData }, ...posts]);
  }

  toggleLike(postId: number) {
    this.posts.update(posts =>
      posts.map(p => p.id === postId
        ? {
          ...p,
          liked: !p.liked,
          reactions: {
            ...p.reactions,
            likes: !p.liked ? p.reactions.likes + 1 : p.reactions.likes - 1
          }
        }
        : p
      )
    );
  }

  toggleSave(postId: number) {
    this.posts.update(posts =>
      posts.map(p => p.id === postId ? { ...p, saved: !p.saved } : p)
    );
  }

  addComment(postId: number, author: string, text: string) {
    this.posts.update(posts =>
      posts.map(p => {
        if (p.id !== postId) return p;
        const newComment = { id: Date.now(), author, text, time: 'just now' };
        return {
          ...p,
          comments: [...(p.comments ?? []), newComment],
          reactions: { ...p.reactions, comments: p.reactions.comments + 1 },
        };
      })
    );
  }
}
