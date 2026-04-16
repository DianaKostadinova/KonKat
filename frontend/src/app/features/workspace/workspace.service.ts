import { Injectable, signal } from '@angular/core';
import { Workspace, Task, TaskStatus, WorkspaceMessage } from './workspace.model';

@Injectable({ providedIn: 'root' })
export class WorkspaceService {

  private workspaces = signal<Workspace[]>([
    {
      id: 3,
      teamName: 'FinTech Rebels',
      hackathon: 'HackMK Winter Edition',
      hackathonDate: 'Nov 20 - 22, 2024',
      members: [
        { id: 4, name: 'Sara Blazevska',   role: 'UI/UX Designer',  online: true },
        { id: 5, name: 'Elena Petrovska',  role: 'Mobile Dev',      online: true },
        { id: 6, name: 'Petar Stojanovski',role: 'Backend Dev',     online: false },
        { id: 0, name: 'You',              role: 'Frontend Dev',    online: true },
      ],
      tasks: [
        { id: 1,  title: 'Setup project repo',           priority: 'high',   status: 'done',       createdAt: '2d ago', assignee: 'Petar Stojanovski' },
        { id: 2,  title: 'Design system + components',   priority: 'high',   status: 'done',       createdAt: '2d ago', assignee: 'Sara Blazevska' },
        { id: 3,  title: 'Auth flow (JWT)',               priority: 'high',   status: 'inprogress', createdAt: '1d ago', assignee: 'Petar Stojanovski', description: 'Login, register, refresh tokens' },
        { id: 4,  title: 'Investment UI screens',         priority: 'high',   status: 'inprogress', createdAt: '1d ago', assignee: 'You', description: 'Dashboard, invest flow, portfolio' },
        { id: 5,  title: 'Mobile app skeleton',           priority: 'medium', status: 'inprogress', createdAt: '1d ago', assignee: 'Elena Petrovska' },
        { id: 6,  title: 'Payment integration (Stripe)',  priority: 'high',   status: 'todo',       createdAt: '1d ago', assignee: 'Petar Stojanovski' },
        { id: 7,  title: 'Pitch deck slides',             priority: 'medium', status: 'todo',       createdAt: '12h ago', assignee: 'Sara Blazevska' },
        { id: 8,  title: 'Demo video recording',          priority: 'low',    status: 'todo',       createdAt: '12h ago' },
      ],
      files: [
        { id: 1, name: 'UI Design System.fig',     type: 'figma',  size: '4.2 MB', uploadedBy: 'Sara',  uploadedAt: '2d ago' },
        { id: 2, name: 'Project Architecture.pdf', type: 'doc',    size: '1.1 MB', uploadedBy: 'Petar', uploadedAt: '1d ago' },
        { id: 3, name: 'App Screenshots.zip',      type: 'image',  size: '8.7 MB', uploadedBy: 'Elena', uploadedAt: '6h ago' },
        { id: 4, name: 'Backend API docs.md',      type: 'code',   size: '0.3 MB', uploadedBy: 'Petar', uploadedAt: '4h ago' },
      ],
      messages: [
        { id: 1, senderId: 4, senderName: 'Sara',  content: 'Design system is ready! Check Figma 🎨',         createdAt: '09:00' },
        { id: 2, senderId: 6, senderName: 'Petar', content: 'Backend API is up at localhost:3000',            createdAt: '09:15' },
        { id: 3, senderId: 5, senderName: 'Elena', content: 'Starting on mobile screens now',                 createdAt: '09:30' },
        { id: 4, senderId: 0, senderName: 'You',   content: 'Investment dashboard is 60% done 💪',            createdAt: '10:00' },
        { id: 5, senderId: 4, senderName: 'Sara',  content: 'Amazing! Can you share a screenshot?',           createdAt: '10:05' },
      ],
      progress: 65,
    },
  ]);

  getById(id: number) {
    return this.workspaces().find(w => w.id === id);
  }

  moveTask(workspaceId: number, taskId: number, status: TaskStatus) {
    this.workspaces.update(ws => ws.map(w => {
      if (w.id !== workspaceId) return w;
      const tasks = w.tasks.map(t => t.id === taskId ? { ...t, status } : t);
      const done = tasks.filter(t => t.status === 'done').length;
      const progress = Math.round((done / tasks.length) * 100);
      return { ...w, tasks, progress };
    }));
  }

  addTask(workspaceId: number, title: string, priority: 'low' | 'medium' | 'high') {
    this.workspaces.update(ws => ws.map(w => {
      if (w.id !== workspaceId) return w;
      const task: Task = {
        id: Date.now(),
        title,
        priority,
        status: 'todo',
        createdAt: 'just now',
        assignee: 'You',
      };
      return { ...w, tasks: [...w.tasks, task] };
    }));
  }

  sendMessage(workspaceId: number, content: string) {
    this.workspaces.update(ws => ws.map(w => {
      if (w.id !== workspaceId) return w;
      const msg: WorkspaceMessage = {
        id: Date.now(),
        senderId: 0,
        senderName: 'You',
        content,
        createdAt: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      };
      return { ...w, messages: [...w.messages, msg] };
    }));
  }
}
