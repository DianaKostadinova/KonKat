import { Injectable, signal, computed, effect, inject, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { Notification, NotificationType } from './notification-bell.model';
import { AuthService } from '../auth/auth.service';
import { WsService } from './ws.service';
import { environment } from '../../../environments/environment';

const API = environment.apiUrl;

function mapType(t: string): NotificationType {
  switch (t) {
    case 'FOLLOW':             return 'mention';
    case 'POST_LIKE':          return 'like';
    case 'POST_COMMENT':       return 'comment';
    case 'POST_SHARE':         return 'like';
    case 'HACKATHON_REGISTER': return 'join_request';
    case 'HACKATHON_SAVED':    return 'hackathon_reminder';
    case 'HACKATHON_INVITE':   return 'join_request';
    case 'HACKATHON_STARTED':  return 'hackathon_reminder';
    case 'PROJECT_INTEREST':   return 'join_request';
    case 'PROJECT_MEMBER':     return 'join_approved';
    case 'MESSAGE':            return 'comment';
    case 'TEAM_REQUEST':       return 'join_request';
    case 'QA_ANSWER':          return 'comment';
    case 'QA_ANSWER_ACCEPTED': return 'join_approved';
    case 'QA_VOTE':            return 'like';
    default:                   return 'mention';
  }
}

function buildMessage(dto: any): string {
  const actor = dto.actorName ?? 'Someone';
  switch (dto.type) {
    case 'HACKATHON_REGISTER': return `${actor} registered for your hackathon`;
    case 'HACKATHON_SAVED':    return `${actor} saved your hackathon`;
    case 'HACKATHON_INVITE':   return `${actor} invited you to their team`;
    case 'HACKATHON_STARTED':  return 'A hackathon you registered for has started!';
    case 'POST_LIKE':          return `${actor} liked your post`;
    case 'POST_COMMENT':       return `${actor} commented on your post`;
    case 'POST_SHARE':         return `${actor} shared your post`;
    case 'FOLLOW':             return `${actor} started following you`;
    case 'PROJECT_INTEREST':   return `${actor} wants to join your project`;
    case 'PROJECT_MEMBER':     return `${actor} added you to a project`;
    case 'MESSAGE':            return `${actor} sent you a message`;
    case 'TEAM_REQUEST':       return `${actor} wants to join your team`;
    case 'QA_ANSWER':          return `${actor} answered your question`;
    case 'QA_ANSWER_ACCEPTED': return 'Your answer was accepted as the solution!';
    case 'QA_VOTE':            return `${actor} upvoted your question`;
    default:                   return `${actor} interacted with you`;
  }
}

function buildTitle(type: string): string {
  switch (type) {
    case 'HACKATHON_REGISTER': return 'New Registration';
    case 'HACKATHON_SAVED':    return 'Hackathon Saved';
    case 'HACKATHON_INVITE':   return 'Team Invite';
    case 'HACKATHON_STARTED':  return 'Hackathon Started!';
    case 'POST_LIKE':          return 'Post Liked';
    case 'POST_COMMENT':       return 'New Comment';
    case 'POST_SHARE':         return 'Post Shared';
    case 'FOLLOW':             return 'New Follower';
    case 'PROJECT_INTEREST':   return 'Project Interest';
    case 'PROJECT_MEMBER':     return 'Added to Project';
    case 'MESSAGE':            return 'New Message';
    case 'TEAM_REQUEST':       return 'Team Join Request';
    case 'QA_ANSWER':          return 'New Answer';
    case 'QA_ANSWER_ACCEPTED': return 'Answer Accepted!';
    case 'QA_VOTE':            return 'Question Upvoted';
    default:                   return 'Notification';
  }
}

@Injectable({ providedIn: 'root' })
export class NotificationService {

  private _notifications = signal<Notification[]>([]);

  unreadCount = computed(() => this._notifications().filter(n => !n.read).length);

  private auth = inject(AuthService);
  private ws   = inject(WsService);

  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private wsSub: Subscription | null = null;

  constructor(private http: HttpClient) {
    effect(() => {
      if (this.auth.isLoggedIn()) {
        this.load();
        this.startPolling();
        void this.connectWs();
      } else {
        this._notifications.set([]);
        this.stopPolling();
        this.disconnectWs();
      }
    });
  }

  // ── WebSocket ────────────────────────────────────────────────────────────

  private async connectWs(): Promise<void> {
    const token = await this.auth.getToken();
    if (!token) return;

    this.wsSub?.unsubscribe();
    this.wsSub = this.ws.message$.subscribe(dto => this.onPush(dto));
    this.ws.connect(token);
  }

  private disconnectWs(): void {
    this.wsSub?.unsubscribe();
    this.wsSub = null;
    this.ws.disconnect();
  }

  private onPush(dto: any): void {
    const incoming = this.mapDto(dto);
    this._notifications.update(list => {
      // Guard against duplicates (e.g. if the polling also fetched it)
      if (list.some(n => n.id === incoming.id)) return list;
      return [incoming, ...list];
    });
  }

  // ── Polling (safety net) ─────────────────────────────────────────────────

  private startPolling(): void {
    this.stopPolling();
    // 60 s — WS handles real-time; polling is a fallback for reconnect gaps
    this.pollInterval = setInterval(() => this.load(), 60_000);
  }

  private stopPolling(): void {
    if (this.pollInterval !== null) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  // ── Public API ───────────────────────────────────────────────────────────

  load(): void {
    this.http.get<any[]>(`${API}/notifications`).subscribe({
      next: dtos => this._notifications.set(dtos.map(d => this.mapDto(d))),
      error: () => { /* keep current state on error */ },
    });
  }

  getAll() { return this._notifications(); }

  markAsRead(id: number): void {
    this._notifications.update(list => list.map(n => n.id === id ? { ...n, read: true } : n));
    this.http.post(`${API}/notifications/${id}/read`, {}).subscribe();
  }

  markAllAsRead(): void {
    this._notifications.update(list => list.map(n => ({ ...n, read: true })));
    this.http.post(`${API}/notifications/read-all`, {}).subscribe();
  }

  delete(id: number): void {
    this._notifications.update(list => list.filter(n => n.id !== id));
    this.http.delete(`${API}/notifications/${id}`).subscribe();
  }

  // ── Mapping ──────────────────────────────────────────────────────────────

  private mapDto(dto: any): Notification {
    return {
      id:        dto.id,
      type:      mapType(dto.type),
      title:     buildTitle(dto.type),
      message:   buildMessage(dto),
      read:      dto.read ?? false,
      createdAt: dto.timeAgo ?? dto.createdAt ?? '',
      avatar:    dto.actorAvatar ?? undefined,
      fromUser:  dto.actorName   ?? undefined,
      actionUrl: dto.type === 'FOLLOW'                                                              ? `/profile/${dto.actorId}`
               : dto.type === 'MESSAGE'                                                              ? `/chat?dm=${dto.actorId}`
               : (dto.type === 'POST_LIKE' || dto.type === 'POST_COMMENT' || dto.type === 'POST_SHARE') && dto.postId
                                                                                                     ? `/feed?post=${dto.postId}`
               : (dto.type === 'QA_ANSWER' || dto.type === 'QA_ANSWER_ACCEPTED' || dto.type === 'QA_VOTE')
                                                                                                     ? '/qa'
               : dto.hackathonId                                                                     ? '/hackathons'
               : dto.projectId                                                                       ? '/projects'
               : dto.type === 'TEAM_REQUEST'                                                         ? '/find-team'
               : undefined,
    };
  }
}
