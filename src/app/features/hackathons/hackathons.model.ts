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
  status: 'upcoming' | 'ongoing' | 'ended';
  registered?: boolean;
}
