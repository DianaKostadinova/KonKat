import { Injectable, signal, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { interval, Subscription } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { Conversation, Message, ConversationDto, MessageDto, UserSearchResult } from './chat.model';

const API = 'http://localhost:8081/api';

@Injectable({ providedIn: 'root' })
export class ChatService implements OnDestroy {

  private _conversations = signal<Conversation[]>([]);
  meId = signal<number>(0);

  private pollSub?: Subscription;
  private convPollSub?: Subscription;

  constructor(private http: HttpClient) {
    this.loadConversations();
    this.convPollSub = interval(8000).subscribe(() => this.loadConversations());
  }

  loadConversations() {
    this.http.get<ConversationDto[]>(`${API}/messages/conversations`)
      .pipe(catchError(() => of([])))
      .subscribe(dtos => {
        this._conversations.update(existing =>
          dtos.map(dto => {
            const ex = existing.find(e => e.id === dto.id && e.type === dto.type);
            return {
              id: dto.id,
              type: dto.type as 'dm' | 'group',
              name: dto.name,
              members: dto.members,
              unread: dto.unreadCount,
              messages: ex?.messages ?? [],
            };
          })
        );
      });
  }

  getAll(): Conversation[] { return this._conversations(); }

  getById(id: number): Conversation | undefined {
    return this._conversations().find(c => c.id === id);
  }

  loadMessages(convId: number, type: 'dm' | 'group') {
    const url = type === 'dm'
      ? `${API}/messages/dm/${convId}/messages`
      : `${API}/messages/group/${convId}/messages`;

    this.http.get<MessageDto[]>(url)
      .pipe(catchError(() => of([])))
      .subscribe(msgs => {
        this._conversations.update(convs => convs.map(c =>
          c.id === convId ? { ...c, messages: msgs.map(m => toMessage(m)), unread: 0 } : c
        ));
      });
  }

  startPolling(convId: number, type: 'dm' | 'group') {
    this.stopPolling();

    this.pollSub = interval(3000).pipe(
      switchMap(() => {
        const conv = this._conversations().find(c => c.id === convId);
        const lastId = conv?.messages.filter(m => m.id > 0).at(-1)?.id ?? 0;
        const url = type === 'dm'
          ? `${API}/messages/dm/${convId}/messages?after=${lastId}`
          : `${API}/messages/group/${convId}/messages?after=${lastId}`;
        return this.http.get<MessageDto[]>(url).pipe(catchError(() => of([])));
      })
    ).subscribe(msgs => {
      if (!msgs.length) return;
      this._conversations.update(convs => convs.map(c =>
        c.id === convId
          ? { ...c, messages: [...c.messages, ...msgs.map(m => toMessage(m))] }
          : c
      ));
    });
  }

  stopPolling() {
    this.pollSub?.unsubscribe();
    this.pollSub = undefined;
  }

  sendMessage(convId: number, content: string, type: 'dm' | 'group') {
    const url = type === 'dm'
      ? `${API}/messages/dm/${convId}/messages`
      : `${API}/messages/group/${convId}/messages`;

    const optimistic: Message = {
      id: -Date.now(),
      senderId: this.meId(),
      content,
      createdAt: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      read: false,
    };

    this._conversations.update(convs => convs.map(c =>
      c.id === convId ? { ...c, messages: [...c.messages, optimistic] } : c
    ));

    this.http.post<MessageDto>(url, { content })
      .pipe(catchError(() => of(null)))
      .subscribe(msg => {
        if (!msg) return;
        this._conversations.update(convs => convs.map(c => {
          if (c.id !== convId) return c;
          return { ...c, messages: c.messages.map(m => m.id === optimistic.id ? toMessage(msg) : m) };
        }));
      });
  }

  markAsRead(convId: number, type: 'dm' | 'group') {
    this._conversations.update(convs => convs.map(c =>
      c.id === convId
        ? { ...c, unread: 0, messages: c.messages.map(m => ({ ...m, read: true })) }
        : c
    ));
    const url = type === 'dm'
      ? `${API}/messages/dm/${convId}/read`
      : `${API}/messages/group/${convId}/read`;
    this.http.patch(url, {}).pipe(catchError(() => of(null))).subscribe();
  }

  openOrCreateDm(userId: number): Promise<Conversation> {
    return new Promise((resolve, reject) => {
      this.http.post<ConversationDto>(`${API}/messages/dm`, { userId })
        .subscribe({
          next: dto => {
            const existing = this._conversations().find(c => c.id === dto.id && c.type === 'dm');
            if (!existing) {
              const conv: Conversation = { id: dto.id, type: 'dm', name: dto.name, members: dto.members, unread: dto.unreadCount, messages: [] };
              this._conversations.update(cs => [conv, ...cs]);
            }
            resolve(this._conversations().find(c => c.id === dto.id && c.type === 'dm')!);
          },
          error: reject,
        });
    });
  }

  createGroup(name: string, memberIds: number[]): Promise<Conversation> {
    return new Promise((resolve, reject) => {
      this.http.post<ConversationDto>(`${API}/messages/group`, { name, memberIds })
        .subscribe({
          next: dto => {
            const conv: Conversation = { id: dto.id, type: 'group', name: dto.name, members: dto.members, unread: 0, messages: [] };
            this._conversations.update(cs => [conv, ...cs]);
            resolve(conv);
          },
          error: reject,
        });
    });
  }

  searchUsers(query: string) {
    return this.http.get<{ users: UserSearchResult[] }>(`${API}/search?q=${encodeURIComponent(query)}`);
  }

  getMemberName(conv: Conversation, senderId: number): string {
    if (senderId === this.meId()) return 'You';
    return conv.members.find(m => m.id === senderId)?.name ?? 'Unknown';
  }

  getLastMessage(conv: Conversation): string {
    const last = conv.messages.at(-1);
    if (!last) return '';
    const name = last.senderId === this.meId() ? 'You' : conv.members.find(m => m.id === last.senderId)?.name?.split(' ')[0] ?? '';
    return conv.type === 'group' ? `${name}: ${last.content}` : last.content;
  }

  ngOnDestroy() {
    this.pollSub?.unsubscribe();
    this.convPollSub?.unsubscribe();
  }
}

function toMessage(dto: MessageDto): Message {
  return { id: dto.id, senderId: dto.senderId, senderName: dto.senderName, content: dto.content, createdAt: dto.createdAt, read: dto.read };
}
