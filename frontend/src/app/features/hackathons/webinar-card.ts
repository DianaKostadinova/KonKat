import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, signal } from '@angular/core';
import { Webinar } from './hackathons.model';
import { RegisterEventModal } from './register-event-modal';

@Component({
  selector: 'app-webinar-card',
  standalone: true,
  imports: [RegisterEventModal],
  templateUrl: './webinar-card.html',
  styleUrl: './webinar-card.css',
})
export class WebinarCard implements OnInit, OnDestroy {
  @Input() webinar!: Webinar;
  @Output() save = new EventEmitter<number>();

  countdown    = signal<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);
  showRegModal = signal(false);

  private timer: any;

  ngOnInit() {
    this.tick();
    this.timer = setInterval(() => this.tick(), 1000);
  }

  ngOnDestroy() { clearInterval(this.timer); }

  private tick() {
    if (!this.webinar.startDate) { this.countdown.set(null); return; }
    const diff = this.webinar.startDate.getTime() - Date.now();
    if (diff <= 0) { this.countdown.set(null); return; }
    this.countdown.set({
      days:    Math.floor(diff / 86_400_000),
      hours:   Math.floor((diff % 86_400_000) / 3_600_000),
      minutes: Math.floor((diff % 3_600_000)  / 60_000),
      seconds: Math.floor((diff % 60_000)     / 1_000),
    });
  }

  formatDate(date: Date | null): string {
    if (!date) return '—';
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  formatTime(date: Date | null): string {
    if (!date) return '';
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }

  onSave()       { this.save.emit(this.webinar.id); }
  openRegister() { this.showRegModal.set(true); }

  pad(n: number): string { return String(n).padStart(2, '0'); }

  safeJoinUrl(url: string | null): string | null {
    if (!url) return null;
    return /^https?:\/\//i.test(url) ? url : `https://${url}`;
  }
}
