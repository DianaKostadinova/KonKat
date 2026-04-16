import {Injectable, signal,computed} from '@angular/core'
import {Notification} from './notification-bell.model'

@Injectable({providedIn: 'root'})
export class NotificationService {
  private notifications = signal<Notification[]>([
    {
      id: 1,
      type: 'join_request',
      title: 'New Join Request',
      message: 'Nikola Georgievski wants to join your team "FinTech Rebels"',
      read: false,
      createdAt: '2 min ago',
      actionUrl: '/workspaces',
      fromUser: 'Nikola Georgievski',
    },
    {
      id: 2,
      type: 'join_approved',
      title: 'Request Approved!',
      message: 'You were accepted into "CodeFest AI Team" 🎉',
      read: false,
      createdAt: '15 min ago',
      actionUrl: '/workspaces',
    },
    {
      id: 3,
      type: 'comment',
      title: 'New Answer',
      message: 'Ana Jovanovska answered your question about JWT refresh tokens',
      read: false,
      createdAt: '1h ago',
      actionUrl: '/qa',
      fromUser: 'Ana Jovanovska',
    },
    {
      id: 4,
      type: 'like',
      title: 'Post Liked',
      message: 'Viktor Risteski and 12 others liked your post',
      read: false,
      createdAt: '2h ago',
      actionUrl: '/feed',
      fromUser: 'Viktor Risteski',
    },
    {
      id: 5,
      type: 'hackathon_reminder',
      title: 'Hackathon Tomorrow!',
      message: 'CodeFest 2024: AI Innovations starts tomorrow at 9:00 AM',
      read: true,
      createdAt: '3h ago',
      actionUrl: '/hackathons',
    },
    {
      id: 6,
      type: 'team_message',
      title: 'Team Message',
      message: 'Sara Blazevska sent a message in "FinTech Rebels"',
      read: true,
      createdAt: '5h ago',
      actionUrl: '/workspace/3',
      fromUser: 'Sara Blazevska',
    },
    {
      id: 7,
      type: 'mention',
      title: 'You were mentioned',
      message: 'Marko Dimitrovski mentioned you in a comment',
      read: true,
      createdAt: '1d ago',
      actionUrl: '/feed',
      fromUser: 'Marko Dimitrovski',
    },
    {
      id: 8,
      type: 'join_rejected',
      title: 'Request Declined',
      message: 'Your request to join "NASA Space Team" was declined',
      read: true,
      createdAt: '2d ago',
      actionUrl: '/teammates',
    },
  ])
  unreadCount = computed(()=>
  this.notifications().filter(n=> !n.read).length
  )
  getAll() {return this.notifications();}

  markAsRead(id: number) {
    this.notifications.update(list=>
    list.map(n=> n.id === id? {...n, read: true}:n)
    )
  }
  markAllAsRead() {
    this.notifications.update(list =>
    list.map(n=> ({ ...n, read:true})))
  }
  delete(id: number) {
    this.notifications.update(list=>list.filter(n=>n.id !== id))
  }
}
