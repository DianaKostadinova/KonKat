export interface Project {
  id: number;
  title: string;
  description: string;
  thumbnail?: string;
  author: {
    name: string;
    role: string;
    avatar?: string;
  };
  techStack: string[];
  githubUrl?: string;
  liveUrl?: string;
  stars: number;
  forks: number;
  comments: number;
  featured?: boolean;
  createdAt: string;
}
