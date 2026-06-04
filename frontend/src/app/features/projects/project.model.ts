export interface Project {
  id: number;
  title: string;
  description: string;
  thumbnail?: string;       // imageUrl from backend (base64 or URL)
  author: {
    id: number;
    name: string;
    role: string;
    avatar?: string;
  };
  techStack: string[];
  githubUrl?: string;
  liveUrl?: string;
  status: string;           // IN_PROGRESS | COMPLETED | LOOKING_FOR_TEAM | ARCHIVED
  stars: number;            // total star count from backend
  starred?: boolean;        // whether the current viewer has starred it
  forks: number;
  comments: number;
  featured?: boolean;
  createdAt: string;
}
