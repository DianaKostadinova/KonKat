import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, signal } from '@angular/core';
import { Hackathon } from './hackathons.model';

@Component({
  selector: 'app-hackathon-card',
  standalone: true,
  imports: [],
  templateUrl: './hackathon-card.html',
  styleUrl: './hackathon-card.css',
})
export class HackathonCard implements OnInit, OnDestroy {
  @Input() hackathon!: Hackathon;
  @Output() register = new EventEmitter<number>();

  countdown = signal({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  private timer: any;

  ngOnInit() {
    this.updateCountdown();
    // Update every second
    this.timer = setInterval(() => this.updateCountdown(), 1000);
  }

  ngOnDestroy() {
    clearInterval(this.timer);
  }

  updateCountdown() {
    const now = new Date().getTime();
    const target = this.hackathon.startDate.getTime();
    const diff = target - now;

    if (diff <= 0) {
      this.countdown.set({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      return;
    }

    this.countdown.set({
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((diff % (1000 * 60)) / 1000),
    });
  }

  get spotsLeft() {
    return this.hackathon.maxTeams - this.hackathon.currentTeams;
  }

  get spotsPercent() {
    return (this.hackathon.currentTeams / this.hackathon.maxTeams) * 100;
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  onRegister() {
    this.register.emit(this.hackathon.id);
  }

  pad(n: number): string {
    return n.toString().padStart(2, '0');
  }
}
