export interface SavedEvent {
  id: number;
  type: 'HACKATHON' | 'WEBINAR';
  title: string;
  startDate: string | null;
  endDate: string | null;
  location: string | null;
  tags: string[];
}

export interface CountdownTime {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export interface EventWithCountdown extends SavedEvent {
  countdown: CountdownTime | null;
  registered?: boolean;
}
