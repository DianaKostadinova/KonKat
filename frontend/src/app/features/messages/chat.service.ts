import { Injectable, signal, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { interval, Subscription } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { of } from 'rxjs';
import { Conversation, Message, ConversationDto, MessageDto, UserSearchResult } from './chat.model';
import { WsService } from '../../shared/notification-bell/ws.service';
import { environment } from '../../../environments/environment';

const API = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class ChatService implements OnDestroy {

  private _conversations = signal<Conversation[]>([]);
  meId = signal<number>(0);

  private _activeConvId: number | null = null;
  private _activeConvType: 'dm' | 'group' | null = null;

  private convPollSub?: Subscription;
  private msgWsSub?: Subscription;
  private notifWsSub?: Subscription;

  constructor(private http: HttpClient, private ws: WsService) {
    this.loadConversations();
    // Fallback poll for reconnect gaps and tab visibility changes
    this.convPollSub = interval(8000).subscribe(() => this.loadConversations());

    // Real-time message delivery via WebSocket
    this.msgWsSub = this.ws.incomingMessage$.subscribe(delivery => {
      const { conversationId, type, message } = delivery;
      if (conversationId === this._activeConvId) {
        // Append to open conversation and auto-mark as read
        this._conversations.update(convs => bumpToTop(
          convs.map(c => c.id === conversationId
            ? { ...c, messages: [...c.messages, toMessage(message)] }
            : c),
          conversationId
        ));
        this.markAsRead(conversationId, type);
      } else {
        // Increment unread badge and bump to top
        this._conversations.update(convs => bumpToTop(
          convs.map(c => c.id === conversationId
            ? { ...c, unread: c.unread + 1 }
            : c),
          conversationId
        ));
      }
    });

    // Refresh conversation list on notification push (catches edge cases)
    this.notifWsSub = this.ws.message$.subscribe(dto => {
      if (dto?.type === 'MESSAGE') this.loadConversations();
    });
  }

  loadConversations() {
    this.http.get<ConversationDto[]>(`${API}/messages/conversations`)
      .pipe(catchError(() => of([])))
      .subscribe(dtos => {
        const existing = this._conversations();

        // Update metadata for existing convs without changing their order,
        // then append any new convs the server knows about (sorted by server order).
        const updated = existing.map(ex => {
          const dto = dtos.find(d => d.id === ex.id && d.type === ex.type);
          if (!dto) return ex;
          return { ...ex, name: dto.name, members: dto.members, unread: dto.unreadCount, lastMessageAt: dto.lastMessageAt };
        });

        const newOnes = dtos
          .filter(dto => !existing.some(e => e.id === dto.id && e.type === dto.type))
          .map(dto => ({
            id: dto.id,
            type: dto.type as 'dm' | 'group',
            name: dto.name,
            members: dto.members,
            unread: dto.unreadCount,
            lastMessageAt: dto.lastMessageAt,
            messages: [] as import('./chat.model').Message[],
          }));

        this._conversations.set([...updated, ...newOnes]);
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
    this._activeConvId = convId;
    this._activeConvType = type;
  }

  stopPolling() {
    this._activeConvId = null;
    this._activeConvType = null;
  }

  sendMessage(convId: number, content: string, type: 'dm' | 'group', fileUrl?: string, fileName?: string) {
    const url = type === 'dm'
      ? `${API}/messages/dm/${convId}/messages`
      : `${API}/messages/group/${convId}/messages`;

    const optimistic: Message = {
      id: -Date.now(),
      senderId: this.meId(),
      content,
      createdAt: new Date().toISOString().slice(0, 19),
      read: false,
      fileUrl,
      fileName,
    };

    this._conversations.update(convs => bumpToTop(
      convs.map(c => c.id === convId ? { ...c, messages: [...c.messages, optimistic] } : c),
      convId
    ));

    this.http.post<MessageDto>(url, { content, fileUrl, fileName })
      .pipe(catchError(() => of(null)))
      .subscribe(msg => {
        if (!msg) return;
        this._conversations.update(convs => convs.map(c => {
          if (c.id !== convId) return c;
          return { ...c, messages: c.messages.map(m => m.id === optimistic.id ? toMessage(msg) : m) };
        }));
      });
  }

  uploadFile(file: File) {
    const form = new FormData();
    form.append('file', file);
    const base = environment.apiUrl.replace(/\/api$/, ''); // e.g. http://localhost:8082
    return this.http.post<{ url: string; fileName: string }>(`${API}/messages/upload`, form).pipe(
      map(res => ({
        ...res,
        url: res.url.startsWith('/') ? `${base}${res.url}` : res.url,
      }))
    );
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
            this._conversations.update(cs => {
              if (cs.some(c => c.id === dto.id && c.type === 'dm')) return cs;
              const conv: Conversation = { id: dto.id, type: 'dm', name: dto.name, members: dto.members, unread: dto.unreadCount, lastMessageAt: dto.lastMessageAt, messages: [] };
              return [conv, ...cs];
            });
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
            this._conversations.update(cs => {
              if (cs.some(c => c.id === dto.id && c.type === 'group')) return cs;
              const conv: Conversation = { id: dto.id, type: 'group', name: dto.name, members: dto.members, unread: 0, lastMessageAt: dto.lastMessageAt, messages: [] };
              return [conv, ...cs];
            });
            resolve(this._conversations().find(c => c.id === dto.id && c.type === 'group')!);
          },
          error: reject,
        });
    });
  }

  openGroupById(groupId: number): Promise<Conversation> {
    return new Promise((resolve, reject) => {
      this.http.get<ConversationDto[]>(`${API}/messages/conversations`)
        .pipe(catchError(() => of([])))
        .subscribe(dtos => {
          const existing = this._conversations();
          const updated = existing.map(ex => {
            const dto = dtos.find(d => d.id === ex.id && d.type === ex.type);
            if (!dto) return ex;
            return { ...ex, name: dto.name, members: dto.members, unread: dto.unreadCount, lastMessageAt: dto.lastMessageAt };
          });
          const newOnes = dtos
            .filter(dto => !existing.some(e => e.id === dto.id && e.type === dto.type))
            .map(dto => ({ id: dto.id, type: dto.type as 'dm' | 'group', name: dto.name, members: dto.members, unread: dto.unreadCount, lastMessageAt: dto.lastMessageAt, messages: [] as import('./chat.model').Message[] }));
          this._conversations.set([...updated, ...newOnes]);
          const conv = this._conversations().find(c => c.id === groupId && c.type === 'group');
          if (conv) resolve(conv);
          else reject(new Error('Group not found'));
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
    const preview = last.content || (last.fileName ? `📎 ${last.fileName}` : last.fileUrl ? '📎 File' : '');
    return conv.type === 'group' ? `${name}: ${preview}` : preview;
  }

  ngOnDestroy() {
    this.convPollSub?.unsubscribe();
    this.msgWsSub?.unsubscribe();
    this.notifWsSub?.unsubscribe();
  }
}

function toMessage(dto: MessageDto): Message {
  return { id: dto.id, senderId: dto.senderId, senderName: dto.senderName, content: dto.content, createdAt: dto.createdAt, read: dto.read, fileUrl: dto.fileUrl, fileName: dto.fileName };
}

function bumpToTop(convs: Conversation[], convId: number): Conversation[] {
  const idx = convs.findIndex(c => c.id === convId);
  if (idx <= 0) return convs;
  return [convs[idx], ...convs.slice(0, idx), ...convs.slice(idx + 1)];
}
