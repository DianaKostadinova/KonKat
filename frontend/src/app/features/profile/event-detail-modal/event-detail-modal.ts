import { Component, Input, Output, EventEmitter, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { SavedEvent } from '../../../shared/event/saved-event.model';
import { Hackathon, Webinar } from '../../hackathons/hackathons.model';
import { HackathonService } from '../../hackathons/hackathons.service';

@Component({
  selector: 'app-event-detail-modal',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './event-detail-modal.html',
})
export class EventDetailModal implements OnInit {
  @Input() event!: SavedEvent;
  @Output() close = new EventEmitter<void>();

  hackathon = signal<Hackathon | null>(null);
  webinar   = signal<Webinar   | null>(null);
  loading   = signal(true);

  constructor(private hackathonService: HackathonService) {}

  ngOnInit(): void {
    if (this.event.type === 'HACKATHON') {
      this.hackathonService.getHackathonById(this.event.id).subscribe({
        next: h => { this.hackathon.set(h); this.loading.set(false); },
        error: () => this.loading.set(false),
      });
    } else {
      this.hackathonService.getWebinarById(this.event.id).subscribe({
        next: w => { this.webinar.set(w); this.loading.set(false); },
        error: () => this.loading.set(false),
      });
    }
  }

  get isWebinar() { return this.event.type === 'WEBINAR'; }

  safeUrl(url: string | null): string | null {
    if (!url) return null;
    return /^https?:\/\//i.test(url) ? url : `https://${url}`;
  }
}
