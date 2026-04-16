import { Injectable, signal } from '@angular/core';
import { UserProfile } from './profile.model';
import { Project } from '../projects/project.model';
import { Post } from '../../shared/post-card/post.model'
@Injectable({ providedIn: 'root' })
export class ProfileService {

  private profile = signal<UserProfile>({
    id: 0,
    name: 'Diana Kostadinova',
    username: 'diana-dev',
    role: 'Software Engineer',
    company: 'KonKat',
    location: 'Skopje, Macedonia',
    bio: 'Passionate frontend developer building cool stuff with Angular and React. Open source contributor. Coffee addict ☕',
    github: 'diana-dev',
    website: 'https://diana.dev.mk',
    coverColor: '#E8593C',
    stats: {
      posts: 24,
      projects: 14,
      hackathons: 3,
      rep: 1240,
      followers: 89,
      following: 42,
    },
    interests: ['Open Source', 'UI/UX', 'Dev Tools', 'Hackathons'],
    techStack: ['Angular', 'React', 'TypeScript', 'Node.js', 'SCSS', 'Tailwind'],
    badges: [
      { label: 'PRO', color: '#E8593C' },
      { label: 'Hackathon Winner', color: '#febc2e' },
      { label: 'Top Contributor', color: '#28c840' },
    ],
    joinedAt: 'January 2024',
  });

  private savedPosts = signal<Post[]>([
    {
      id: 10,
      author: { name: 'Ana Jovanovska', role: 'Fullstack Dev', location: 'Skopje', time: '3d ago', badge: 'PRO' },
      type: 'code',
      content: 'Clean way to handle async operations in Angular using signals + rxjs interop.',
      code: {
        language: 'typescript',
        snippet: `const data = toSignal(
  this.http.get('/api/data'),
  { initialValue: [] }
);`
      },
      tags: ['#angular', '#signals', '#rxjs'],
      reactions: { likes: 67, comments: 14, shares: 8 },
      liked: false,
    },
  ]);

  private likedPosts = signal<Post[]>([
    {
      id: 11,
      author: { name: 'Viktor Risteski', role: 'Backend Engineer', location: 'Bitola', time: '1w ago' },
      type: 'text',
      content: 'Just deployed my first microservices architecture to production. The monitoring setup with Grafana + Prometheus is absolutely worth it.',
      tags: ['#devops', '#microservices'],
      reactions: { likes: 94, comments: 21, shares: 12 },
      liked: true,
    },
  ]);

  getProfile() { return this.profile(); }
  updateProfile(updates: Partial<UserProfile>) {
    this.profile.update(p => ({ ...p, ...updates }));
  }
  getSavedPosts() { return this.savedPosts(); }
  getLikedPosts() { return this.likedPosts(); }
}
