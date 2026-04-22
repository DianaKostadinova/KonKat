import { Component, Output, EventEmitter, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HackathonService } from './hackathons.service';
import { Hackathon, Webinar } from './hackathons.model';

type EventType = 'hackathon' | 'webinar';

@Component({
  selector: 'app-create-event-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './create-event-modal.html',
  styleUrl: './create-event-modal.css',
})
export class CreateEventModal {
  @Output() close   = new EventEmitter<void>();
  @Output() created = new EventEmitter<Hackathon | Webinar>();

  eventType = signal<EventType>('hackathon');
  submitting = signal(false);
  error = signal<string | null>(null);

  // ── Shared fields ─────────────────────────────────────────────────────────
  title       = '';
  description = '';
  location    = '';
  startDate   = '';
  endDate     = '';
  tagsRaw     = '';   // comma-separated

  // ── Hackathon-only ────────────────────────────────────────────────────────
  prize       = '';
  maxTeamSize = '';

  // ── Webinar-only ──────────────────────────────────────────────────────────
  speakerName  = '';
  speakerTitle = '';
  joinUrl      = '';

  constructor(private hackathonService: HackathonService) {}

  setType(t: EventType) { this.eventType.set(t); }

  parseTags(): string[] {
    return this.tagsRaw.split(',').map(t => t.trim()).filter(Boolean);
  }

  /** Convert datetime-local input value to ISO string the backend expects */
  toISO(val: string): string | undefined {
    if (!val) return undefined;
    // datetime-local gives "2025-06-15T09:00" — backend wants "2025-06-15T09:00:00"
    return val.length === 16 ? val + ':00' : val;
  }

  submit() {
    if (!this.title.trim()) { this.error.set('Title is required.'); return; }
    this.error.set(null);
    this.submitting.set(true);

    if (this.eventType() === 'hackathon') {
      this.hackathonService.createHackathon({
        title:       this.title.trim(),
        description: this.description || undefined,
        location:    this.location    || undefined,
        startDate:   this.toISO(this.startDate),
        endDate:     this.toISO(this.endDate),
        prize:       this.prize       || undefined,
        maxTeamSize: this.maxTeamSize ? parseInt(this.maxTeamSize, 10) : undefined,
        tags:        this.parseTags(),
      }).subscribe({
        next: h  => { this.submitting.set(false); this.created.emit(h); this.close.emit(); },
        error: () => { this.submitting.set(false); this.error.set('Failed to create hackathon. Please try again.'); },
      });

    } else {
      this.hackathonService.createWebinar({
        title:        this.title.trim(),
        description:  this.description  || undefined,
        speakerName:  this.speakerName  || undefined,
        speakerTitle: this.speakerTitle || undefined,
        location:     this.location     || undefined,
        startDate:    this.toISO(this.startDate),
        endDate:      this.toISO(this.endDate),
        joinUrl:      this.joinUrl      || undefined,
        tags:         this.parseTags(),
      }).subscribe({
        next: w  => { this.submitting.set(false); this.created.emit(w); this.close.emit(); },
        error: () => { this.submitting.set(false); this.error.set('Failed to create webinar. Please try again.'); },
      });
    }
  }
}
