export type PostType = 'text' | 'code' | 'media';

export interface Comment {
  id: number;
  author: string;
  text: string;
  time: string;
}

export interface Post {
  id: number;
  author: {
    id?: number;       // real DB user id — used for profile filtering
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
  saved?: boolean;
  comments?: Comment[];
}
