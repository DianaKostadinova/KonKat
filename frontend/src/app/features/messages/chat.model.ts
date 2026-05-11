export interface Message {
  id: number;
  senderId: number;
  senderName?: string;
  content: string;
  createdAt: string;
  read: boolean;
  fileUrl?: string;
  fileName?: string;
}

export interface ConversationMember {
  id: number;
  name: string;
  role: string;
  avatarUrl?: string;
}

export interface Conversation {
  id: number;
  type: 'dm' | 'group';
  name: string;
  members: ConversationMember[];
  messages: Message[];
  unread: number;
  lastMessageAt?: string;
  online?: boolean;
}

export interface ConversationDto {
  id: number;
  type: string;
  name: string;
  members: ConversationMember[];
  unreadCount: number;
  lastMessageContent?: string;
  lastMessageAt?: string;
  lastMessageSenderId?: number;
}

export interface MessageDto {
  id: number;
  senderId: number;
  senderName: string;
  content: string;
  createdAt: string;
  read: boolean;
  fileUrl?: string;
  fileName?: string;
}

export interface UserSearchResult {
  id: number;
  name: string;
  username?: string;
  role?: string;
  location?: string;
  avatarUrl?: string;
}
