export type RequestStatus = 'none' | 'pending' | 'approved' | 'rejected' | 'own';

export interface TeamMember {
  id: number;
  name: string;
  role: string | null;
  avatarUrl: string | null;
}

export interface TeamPost {
  id: number;
  hackathon: {
    id: number;
    title: string;
    city: string | null;
    startDate: string | null;
    endDate: string | null;
  };
  author: TeamMember;
  title: string;
  description: string | null;
  techStack: string[];
  location: string | null;
  maxMembers: number;
  members: TeamMember[];
  lookingFor: string[];
  requestStatus: RequestStatus;
  isOwn: boolean;
  createdAt: string;
}

export interface CreateTeamPostRequest {
  hackathonId: number;
  title: string;
  description: string;
  techStack: string[];
  location: string;
  maxMembers: number;
  lookingFor: string[];
}
