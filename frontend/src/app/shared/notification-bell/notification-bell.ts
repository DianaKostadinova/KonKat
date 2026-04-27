import { Component, Output, EventEmitter, signal } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { NotificationService } from './notification.service';
import { Notification, NotificationType } from './notification-bell.model';

@Component({
  selector: 'app-notification-dropdown',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './notification-bell.html',
  styleUrl: './notification-bell.css',
})
export class NotificationDropdown {
  @Output() close = new EventEmitter<void>();

  filter = signal<'all' | 'unread'>('all');

  constructor(public notificationService: NotificationService, private router: Router) {}

  filteredNotifications() {
    const all = this.notificationService.getAll();
    return this.filter() === 'unread'
      ? all.filter(n => !n.read)
      : all;
  }

  onNotificationClick(notification: Notification) {
    this.notificationService.markAsRead(notification.id);
    this.close.emit();
    if (notification.actionUrl) {
      this.router.navigateByUrl(notification.actionUrl);
    }
  }

  onDelete(event: Event, id: number) {
    event.stopPropagation();
    event.preventDefault();
    this.notificationService.delete(id);
  }

  markAllRead() {
    this.notificationService.markAllAsRead();
  }

  notificationIcon(type: NotificationType): string {
    switch (type) {
      case 'join_request':      return 'person_add';
      case 'join_approved':     return 'check_circle';
      case 'join_rejected':     return 'cancel';
      case 'comment':           return 'chat_bubble_outline';
      case 'like':              return 'favorite';
      case 'hackathon_reminder':return 'emoji_events';
      case 'team_message':      return 'groups';
      case 'mention':           return 'alternate_email';
      default:                  return 'notifications';
    }
  }

  notificationColor(type: NotificationType): string {
    switch (type) {
      case 'join_approved':     return '#28c840';
      case 'join_rejected':     return '#888888';
      case 'like':              return '#E8593C';
      case 'hackathon_reminder':return '#febc2e';
      case 'join_request':      return '#3b82f6';
      case 'mention':           return '#a855f7';
      default:                  return '#888888';
    }
  }
}
