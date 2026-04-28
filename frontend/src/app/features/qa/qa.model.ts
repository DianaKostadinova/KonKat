export interface QAAuthor {
  id: number;
  name: string;
  title?: string;
}

export interface QAAnswer {
  id: number;
  author: QAAuthor;
  content: string;
  codeLanguage?: string;
  codeSnippet?: string;
  votes: number;
  userVote?: 'UP' | 'DOWN' | null;
  isAccepted: boolean;
  createdAt: string;
}

export interface QAQuestion {
  id: number;
  author: QAAuthor;
  title: string;
  content: string;
  codeLanguage?: string;
  codeSnippet?: string;
  tags: string[];
  votes: number;
  userVote?: 'UP' | 'DOWN' | null;
  views: number;
  answers: QAAnswer[];
  answerCount: number;
  solved: boolean;
  createdAt: string;
}
