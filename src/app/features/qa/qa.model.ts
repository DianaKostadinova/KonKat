export interface QAComment {
  id: number;
  author: { name: string; role: string; };
  content: string;
  votes: number;
  voted?: 'up' | 'down' | null;
  isAccepted?: boolean;
  createdAt: string;
  code?: { language: string; snippet: string; };
}

export interface QAPost {
  id: number;
  author: { name: string; role: string; };
  title: string;
  content: string;
  code?: { language: string; snippet: string; };
  tags: string[];
  votes: number;
  voted?: 'up' | 'down' | null;
  views: number;
  comments: QAComment[];
  solved: boolean;
  createdAt: string;
}
