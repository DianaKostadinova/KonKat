export interface UserProfile {
  id: number;
  name: string;
  username: string;
  role: string;
  company: string;
  location: string;
  bio: string;
  github: string;
  website?: string;
  avatar?: string;
  interests: string[];
  coverColor: string;
  coverImage?: string;
  stats: {
    posts: number;
    projects: number;
    hackathons: number;
    rep: number;
    followers: number;
    following: number;
  };
  techStack: string[];
  badges: { label: string; color: string; }[];
  joinedAt: string;
  isFollowing?: boolean;
}
