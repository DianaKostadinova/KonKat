import { Component, signal, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Notification {
  id: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-bell.html',
  styleUrl: './notification-bell.css',
})
export class NotificationBell implements OnInit {
  isDropdownOpen = signal(false);
  notifications = signal<Notification[]>([]);

  ngOnInit() {
    this.notifications.set([
      { id: '1', message: 'New message from John', timestamp: new Date(), read: false },
      { id: '2', message: 'Your post was liked', timestamp: new Date(), read: false },
      { id: '3', message: 'Team invitation received', timestamp: new Date(), read: true },
    ]);
  }

  toggleDropdown() {
    this.isDropdownOpen.update(v => !v);
  }

  closeDropdown() {
    this.isDropdownOpen.set(false);
  }

  markAsRead(notificationId: string) {
    this.notifications.update(notifications =>
      notifications.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.notification-bell')) {
      this.closeDropdown();
    }
  }
}