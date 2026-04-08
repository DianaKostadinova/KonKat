export type PostType = 'text' | 'code' | 'media';

export interface Post {
  id: number;
  author: {
    name: string;
    role: string;
    location: string;
    time: string;
    badge?: string;
  };
  content: string;
  type: PostType;
  code?: {
    language: string;
    snippet: string;
  };
  tags?: string[];
  reactions: {
    likes: number;
    comments: number;
    shares: number;
  };
  liked?: boolean;
}
