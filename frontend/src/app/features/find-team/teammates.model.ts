export type RequestStatus = 'none' | 'pending' | 'approved' | 'rejected';

export interface TeamMember {
  id: number;
  name: string;
  role: string;
  avatar?: string;
  profileUrl?: string;
}

export interface TeamPost {
  id: number;
  hackathon: {
    id: number;
    title: string;
    city: string;
    startDate: Date;
    endDate: Date;
  };
  author: TeamMember;
  title: string;
  description: string;
  techStack: string[];
  location: string;
  maxMembers: number;
  members: TeamMember[];
  lookingFor: string[];
  createdAt: string;
  requestStatus: RequestStatus;
}
