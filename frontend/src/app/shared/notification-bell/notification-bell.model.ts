export type NotificationType =
  | 'join_request'
  | 'join_approved'
  | 'join_rejected'
  | 'comment'
  | 'like'
  | 'hackathon_reminder'
  | 'team_message'
  | 'mention';

export interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
  avatar?: string;
  fromUser?: string;
}
