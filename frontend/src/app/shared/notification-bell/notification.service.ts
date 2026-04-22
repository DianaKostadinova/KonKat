import { Injectable, signal, computed } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Notification, NotificationType } from './notification-bell.model';

const API = 'http://localhost:8081/api';

/** Maps backend NotificationType string to frontend NotificationType */
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
    case 'FOLLOW':             return `${actor} started following you`;
    case 'PROJECT_INTEREST':   return `${actor} wants to join your project`;
    case 'PROJECT_MEMBER':     return `${actor} added you to a project`;
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
    case 'FOLLOW':             return 'New Follower';
    case 'PROJECT_INTEREST':   return 'Project Interest';
    case 'PROJECT_MEMBER':     return 'Added to Project';
    default:                   return 'Notification';
  }
}

@Injectable({ providedIn: 'root' })
export class NotificationService {

  private _notifications = signal<Notification[]>([]);

  unreadCount = computed(() => this._notifications().filter(n => !n.read).length);

  constructor(private http: HttpClient) {
    this.load();
  }

  load(): void {
    const token = localStorage.getItem('token');
    if (!token) return;
    this.http
      .get<any[]>(`${API}/notifications`, { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) })
      .subscribe({
        next: dtos => this._notifications.set(dtos.map(d => this.mapDto(d))),
        error: ()  => { /* keep current state on error */ },
      });
  }

  getAll() { return this._notifications(); }

  markAsRead(id: number): void {
    this._notifications.update(list => list.map(n => n.id === id ? { ...n, read: true } : n));
    const token = localStorage.getItem('token');
    if (token) {
      this.http
        .post(`${API}/notifications/${id}/read`, {}, { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) })
        .subscribe();
    }
  }

  markAllAsRead(): void {
    this._notifications.update(list => list.map(n => ({ ...n, read: true })));
    const token = localStorage.getItem('token');
    if (token) {
      this.http
        .post(`${API}/notifications/read-all`, {}, { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) })
        .subscribe();
    }
  }

  delete(id: number): void {
    this._notifications.update(list => list.filter(n => n.id !== id));
    const token = localStorage.getItem('token');
    if (token) {
      this.http
        .delete(`${API}/notifications/${id}`, { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) })
        .subscribe();
    }
  }

  private mapDto(dto: any): Notification {
    return {
      id:         dto.id,
      type:       mapType(dto.type),
      title:      buildTitle(dto.type),
      message:    buildMessage(dto),
      read:       dto.read ?? false,
      createdAt:  dto.timeAgo ?? dto.createdAt ?? '',
      avatar:     dto.actorAvatar ?? undefined,
      fromUser:   dto.actorName   ?? undefined,
      actionUrl:  dto.hackathonId ? '/hackathons'
                : dto.postId      ? '/feed'
                : dto.projectId   ? '/projects'
                : undefined,
    };
  }
}
