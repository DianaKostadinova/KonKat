import {Injectable, signal} from '@angular/core';
import { Project } from './project.model'

@Injectable({providedIn: 'root'})

export class ProjectService {
  private projects = signal<Project[]>([
    {
      id: 1,
      title: 'DevTask — Dark Themed Task Manager',
      description: 'A keyboard-first task manager built with Next.js and Tailwind. Features drag & drop, keyboard shortcuts, and a clean dark UI. Built for developers who live in the terminal.',
      author: { name: 'Ana Jovanovska', role: 'Fullstack Dev' },
      techStack: ['Next.js', 'TypeScript', 'Tailwind', 'PostgreSQL'],
      githubUrl: 'https://github.com',
      liveUrl: 'https://devtask.mk',
      stars: 142,
      forks: 23,
      comments: 18,
      featured: true,
      createdAt: '2 days ago',
    },
    {
      id: 2,
      title: 'MK Jobs — Local Dev Job Board',
      description: 'Job board focused on Macedonian tech companies. Filter by stack, salary, remote/hybrid. Built with Angular and Supabase.',
      author: { name: 'Viktor Risteski', role: 'Backend Engineer' },
      techStack: ['Angular', 'Supabase', 'TypeScript'],
      githubUrl: 'https://github.com',
      stars: 89,
      forks: 11,
      comments: 24,
      featured: true,
      createdAt: '5 days ago',
    },
    {
      id: 3,
      title: 'CodeShare — Snippet Manager',
      description: 'Save, organize and share code snippets with syntax highlighting. Supports 40+ languages.',
      author: { name: 'Marko Dimitrovski', role: 'DevOps Engineer' },
      techStack: ['React', 'Node.js', 'MongoDB'],
      githubUrl: 'https://github.com',
      stars: 67,
      forks: 8,
      comments: 12,
      createdAt: '1 week ago',
    },
    {
      id: 4,
      title: 'UI Components Library',
      description: 'Open source Angular component library with dark mode support. 30+ components, fully typed.',
      author: { name: 'Sara Blazevska', role: 'UI/UX Designer' },
      techStack: ['Angular', 'SCSS', 'Storybook'],
      githubUrl: 'https://github.com',
      liveUrl: 'https://ui.mk',
      stars: 203,
      forks: 41,
      comments: 35,
      createdAt: '2 weeks ago',
    },
    {
      id: 5,
      title: 'MK Weather CLI',
      description: 'Terminal weather app for Macedonian cities. Colorful output, hourly forecasts, and ASCII art.',
      author: { name: 'Petar Stojanovski', role: 'Systems Engineer' },
      techStack: ['Python', 'Click', 'Rich'],
      githubUrl: 'https://github.com',
      stars: 44,
      forks: 6,
      comments: 9,
      createdAt: '3 weeks ago',
    },
    {
      id: 6,
      title: 'Skopje Transit Tracker',
      description: 'Real-time bus tracker for Skopje public transport. Uses city API + Google Maps.',
      author: { name: 'Elena Petrovska', role: 'Mobile Dev' },
      techStack: ['React Native', 'Google Maps API', 'Node.js'],
      githubUrl: 'https://github.com',
      stars: 156,
      forks: 29,
      comments: 42,
      createdAt: '1 month ago',
    },
  ]);
  getProjects = () => {
    return this.projects();
  }
  getFeatured(){
    return this.projects().filter(p => p.featured);
  }
  filterByTech(tech: string) {
    if (!tech) return this.projects();
    return this.projects().filter(p =>
      p.techStack.some(t => t.toLowerCase().includes(tech.toLowerCase()))
    );
  }
  sortBy(projects: Project[], sort: string): Project[] {
    switch (sort) {
      case 'newest': return [...projects].sort((a, b) => a.id > b.id ? -1 : 1);
      case 'popular': return [...projects].sort((a, b) => b.stars - a.stars);
      case 'discussed': return [...projects].sort((a, b) => b.comments - a.comments);
      default: return projects;
    }
  }
}
