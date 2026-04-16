export interface Message {
  id: number;
  senderId: number;
  content: string;
  createdAt: string;
  read: boolean;
}

export interface Conversation {
  id: number;
  type: 'dm' | 'group';
  name: string;
  members: { id: number; name: string; role: string; }[];
  messages: Message[];
  unread: number;
  online?: boolean;
}
