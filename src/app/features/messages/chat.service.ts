import { Injectable, signal } from '@angular/core';
import { Conversation, Message } from './chat.model';

@Injectable({ providedIn: 'root' })
export class ChatService {
  readonly ME_ID = 0;

  private conversations = signal<Conversation[]>([
    {
      id: 1, type: 'dm', name: 'Ana Jovanovska', unread: 2, online: true,
      members: [{ id: 1, name: 'Ana Jovanovska', role: 'Fullstack Dev' }],
      messages: [
        { id: 1, senderId: 1, content: 'Hey! Did you see the new CodeFest hackathon?', createdAt: '10:32', read: true },
        { id: 2, senderId: 0, content: 'Yes! I was thinking of joining. You in?', createdAt: '10:33', read: true },
        { id: 3, senderId: 1, content: 'Definitely! We should form a team. I can do the backend.', createdAt: '10:35', read: true },
        { id: 4, senderId: 1, content: 'Do you know anyone good at ML?', createdAt: '10:36', read: false },
      ],
    },
    {
      id: 2, type: 'dm', name: 'Viktor Risteski', unread: 0, online: false,
      members: [{ id: 2, name: 'Viktor Risteski', role: 'Backend Engineer' }],
      messages: [
        { id: 1, senderId: 2, content: 'Thanks for the code review!', createdAt: 'Yesterday', read: true },
        { id: 2, senderId: 0, content: 'No problem! Your algorithm was clever.', createdAt: 'Yesterday', read: true },
      ],
    },
    {
      id: 3, type: 'group', name: 'CodeFest Team 🚀', unread: 5, online: true,
      members: [
        { id: 1, name: 'Ana Jovanovska', role: 'Fullstack Dev' },
        { id: 3, name: 'Marko Dimitrovski', role: 'DevOps' },
        { id: 4, name: 'Sara Blazevska', role: 'Designer' },
      ],
      messages: [
        { id: 1, senderId: 1, content: 'Alright team, let\'s plan the architecture!', createdAt: '09:00', read: true },
        { id: 2, senderId: 3, content: 'I\'ll set up the Docker containers.', createdAt: '09:05', read: true },
        { id: 3, senderId: 4, content: 'I\'ll start on the UI mockups tonight.', createdAt: '09:10', read: true },
        { id: 4, senderId: 1, content: 'Perfect! Let\'s sync tomorrow morning.', createdAt: '09:15', read: false },
        { id: 5, senderId: 3, content: 'Sounds good 👍', createdAt: '09:16', read: false },
      ],
    },
    {
      id: 4, type: 'dm', name: 'Sara Blazevska', unread: 1, online: true,
      members: [{ id: 4, name: 'Sara Blazevska', role: 'UI/UX Designer' }],
      messages: [
        { id: 1, senderId: 4, content: 'Check out my new Figma designs!', createdAt: '08:00', read: false },
      ],
    },
  ]);

  getAll() { return this.conversations(); }

  getById(id: number) {
    return this.conversations().find(c => c.id === id);
  }

  sendMessage(conversationId: number, content: string) {
    this.conversations.update(convs => convs.map(c => {
      if (c.id !== conversationId) return c;
      const msg: Message = {
        id: Date.now(),
        senderId: this.ME_ID,
        content,
        createdAt: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        read: true,
      };
      return { ...c, messages: [...c.messages, msg], unread: 0 };
    }));
  }

  markAsRead(conversationId: number) {
    this.conversations.update(convs => convs.map(c =>
      c.id === conversationId
        ? { ...c, unread: 0, messages: c.messages.map(m => ({ ...m, read: true })) }
        : c
    ));
  }

  getMemberName(conv: Conversation, senderId: number): string {
    if (senderId === this.ME_ID) return 'You';
    return conv.members.find(m => m.id === senderId)?.name ?? 'Unknown';
  }

  getLastMessage(conv: Conversation): string {
    const last = conv.messages.at(-1);
    if (!last) return '';
    const name = last.senderId === this.ME_ID ? 'You' : conv.members.find(m => m.id === last.senderId)?.name?.split(' ')[0] ?? '';
    return conv.type === 'group' ? `${name}: ${last.content}` : last.content;
  }
}
