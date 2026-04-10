import { Injectable, signal } from '@angular/core';
import { TeamPost } from './teammates.model';

@Injectable({ providedIn: 'root' })
export class TeamService {

  private teams = signal<TeamPost[]>([
    {
      id: 1,
      hackathon: {
        id: 1,
        title: 'CodeFest 2024: AI Innovations',
        city: 'Ohrid',
        startDate: new Date('2024-10-14'),
        endDate: new Date('2024-10-16'),
      },
      author: {
        id: 1,
        name: 'Ana Jovanovska',
        role: 'Fullstack Dev',
      },
      title: 'AI-powered accessibility tool for visually impaired',
      description: 'We want to build a real-time screen reader that uses AI to describe UI elements and images. Looking for motivated devs who care about accessibility and want to make a real impact.',
      techStack: ['Python', 'TensorFlow', 'React', 'FastAPI'],
      location: 'Ohrid',
      maxMembers: 5,
      members: [
        { id: 1, name: 'Ana Jovanovska', role: 'Fullstack Dev' },
        { id: 2, name: 'Viktor Risteski', role: 'ML Engineer' },
      ],
      lookingFor: ['Frontend Dev', 'UX Designer', 'ML Engineer'],
      createdAt: '2h ago',
      requestStatus: 'none',
    },
    {
      id: 2,
      hackathon: {
        id: 2,
        title: 'NASA Space Apps Challenge',
        city: 'Skopje',
        startDate: new Date('2024-11-05'),
        endDate: new Date('2024-11-06'),
      },
      author: {
        id: 3,
        name: 'Marko Dimitrovski',
        role: 'DevOps Engineer',
      },
      title: 'Satellite data visualizer for climate tracking',
      description: 'Using NASA open datasets to build an interactive 3D globe showing climate change over time. We need people passionate about data visualization and our planet.',
      techStack: ['Three.js', 'Node.js', 'PostgreSQL', 'TypeScript'],
      location: 'Skopje',
      maxMembers: 4,
      members: [
        { id: 3, name: 'Marko Dimitrovski', role: 'DevOps Engineer' },
      ],
      lookingFor: ['Frontend Dev', 'Data Engineer', 'Backend Dev'],
      createdAt: '5h ago',
      requestStatus: 'pending',
    },
    {
      id: 3,
      hackathon: {
        id: 3,
        title: 'HackMK Winter Edition',
        city: 'Bitola',
        startDate: new Date('2024-11-20'),
        endDate: new Date('2024-11-22'),
      },
      author: {
        id: 4,
        name: 'Sara Blazevska',
        role: 'UI/UX Designer',
      },
      title: 'FinTech app for micro-investments in MK startups',
      description: 'Think Kickstarter but for equity. Macedonian citizens invest small amounts in local startups. We have the idea and the design — need engineers to make it real.',
      techStack: ['Angular', 'Node.js', 'MongoDB', 'Stripe'],
      location: 'Bitola',
      maxMembers: 5,
      members: [
        { id: 4, name: 'Sara Blazevska', role: 'UI/UX Designer' },
        { id: 5, name: 'Elena Petrovska', role: 'Mobile Dev' },
        { id: 6, name: 'Petar Stojanovski', role: 'Backend Dev' },
      ],
      lookingFor: ['Frontend Dev', 'Blockchain Dev'],
      createdAt: '1d ago',
      requestStatus: 'approved',
    },
    {
      id: 4,
      hackathon: {
        id: 1,
        title: 'CodeFest 2024: AI Innovations',
        city: 'Ohrid',
        startDate: new Date('2024-10-14'),
        endDate: new Date('2024-10-16'),
      },
      author: {
        id: 7,
        name: 'Nikola Georgievski',
        role: 'Mobile Dev',
      },
      title: 'Smart city parking app with AR navigation',
      description: 'Real-time parking availability in Skopje using IoT sensors + AR navigation to guide drivers to free spots. We have hardware partners ready.',
      techStack: ['React Native', 'ARKit', 'IoT', 'Firebase'],
      location: 'Ohrid',
      maxMembers: 4,
      members: [
        { id: 7, name: 'Nikola Georgievski', role: 'Mobile Dev' },
        { id: 8, name: 'Maja Todorovska', role: 'Backend Dev' },
      ],
      lookingFor: ['AR Developer', 'IoT Engineer'],
      createdAt: '2d ago',
      requestStatus: 'none',
    },
  ]);

  getAll() { return this.teams(); }

  requestJoin(teamId: number) {
    this.teams.update(list =>
      list.map(t => t.id === teamId
        ? { ...t, requestStatus: 'pending' as const }
        : t
      )
    );
  }

  cancelRequest(teamId: number) {
    this.teams.update(list =>
      list.map(t => t.id === teamId
        ? { ...t, requestStatus: 'none' as const }
        : t
      )
    );
  }
}
