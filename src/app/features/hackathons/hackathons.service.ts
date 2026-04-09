import { Injectable, signal } from '@angular/core';
import { Hackathon } from './hackathons.model';

@Injectable({ providedIn: 'root' })
export class HackathonService {

  private hackathons = signal<Hackathon[]>([
    {
      id: 1,
      title: 'CodeFest 2024: AI Innovations',
      description: 'Build AI-powered solutions for real Macedonian problems. 48 hours of coding, mentorship from industry experts, and prizes worth €5,000. Open to all skill levels.',
      location: 'Metropol Lake Resort',
      city: 'Ohrid',
      startDate: new Date('2024-10-14'),
      endDate: new Date('2024-10-16'),
      registrationDeadline: new Date('2024-10-07'),
      maxTeams: 30,
      currentTeams: 18,
      prizePool: '€5,000',
      tags: ['AI', 'Machine Learning', 'Open Data'],
      organizer: 'Finki Innovation Hub',
      status: 'upcoming',
      registered: false,
    },
    {
      id: 2,
      title: 'NASA Space Apps Challenge',
      description: 'Global hackathon with local Skopje node. Work on NASA open data challenges with participants from around the world. Top teams advance to global competition.',
      location: 'UKIM Faculty of Computer Science',
      city: 'Skopje',
      startDate: new Date('2024-11-05'),
      endDate: new Date('2024-11-06'),
      registrationDeadline: new Date('2024-10-28'),
      maxTeams: 25,
      currentTeams: 12,
      prizePool: '€3,000',
      tags: ['Space', 'Open Data', 'NASA', 'Global'],
      organizer: 'NASA / Local Node MK',
      status: 'upcoming',
      registered: false,
    },
    {
      id: 3,
      title: 'HackMK Winter Edition',
      description: 'The biggest winter hackathon in Macedonia. Focus on FinTech and sustainability solutions. Teams of 3-5, 36 hours non-stop.',
      location: 'Sirius Conference Center',
      city: 'Bitola',
      startDate: new Date('2024-11-20'),
      endDate: new Date('2024-11-22'),
      registrationDeadline: new Date('2024-11-10'),
      maxTeams: 40,
      currentTeams: 8,
      prizePool: '€8,000',
      tags: ['FinTech', 'Sustainability', 'Open Source'],
      organizer: 'HackMK Community',
      status: 'upcoming',
      registered: false,
    },
    {
      id: 4,
      title: 'DevWeekend Hackathon',
      description: 'Casual weekend hackathon for developers of all levels. Great for beginners! Mentors available throughout the event.',
      location: 'StartupHub Skopje',
      city: 'Skopje',
      startDate: new Date('2024-12-07'),
      endDate: new Date('2024-12-08'),
      registrationDeadline: new Date('2024-12-01'),
      maxTeams: 20,
      currentTeams: 5,
      prizePool: '€1,500',
      tags: ['Beginner Friendly', 'Web', 'Mobile'],
      organizer: 'KonKat Community',
      status: 'upcoming',
      registered: true,
    },
  ]);

  getAll() { return this.hackathons(); }

  toggleRegister(id: number) {
    this.hackathons.update(list =>
      list.map(h => h.id === id ? { ...h, registered: !h.registered } : h)
    );
  }
}
