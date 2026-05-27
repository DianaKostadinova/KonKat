export interface Hackathon {
  id: number;
  title: string;
  description: string;
  location: string;
  city: string;
  startDate: Date;
  endDate: Date;
  registrationDeadline: Date;
  maxTeams: number;
  currentTeams: number;
  prizePool: string;
  tags: string[];
  organizer: string;
  organizerAvatar?: string | null;
  status: 'upcoming' | 'ongoing' | 'ended';
  registered?: boolean;
  saved?: boolean;
}

export interface Webinar {
  id: number;
  title: string;
  description: string | null;
  speakerName: string | null;
  speakerTitle: string | null;
  startDate: Date | null;
  endDate: Date | null;
  location: string | null;
  joinUrl: string | null;
  thumbnailUrl: string | null;
  status: string;
  tags: string[];
  organizerName: string;
  saved?: boolean;
  attending?: boolean;
}

export interface CreateHackathonPayload {
  title: string;
  description?: string;
  location?: string;
  startDate?: string;   // ISO local datetime string
  endDate?: string;
  prize?: string;
  maxTeamSize?: number;
  tags: string[];
}

export interface CreateWebinarPayload {
  title: string;
  description?: string;
  speakerName?: string;
  speakerTitle?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  joinUrl?: string;
  tags: string[];
}
