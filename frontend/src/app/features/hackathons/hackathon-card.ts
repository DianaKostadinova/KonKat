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
  @Output() register  = new EventEmitter<number>();
  @Output() save      = new EventEmitter<number>();

  countdown = signal({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  private timer: any;

  ngOnInit() {
    this.updateCountdown();
    this.timer = setInterval(() => this.updateCountdown(), 1000);
  }

  ngOnDestroy() { clearInterval(this.timer); }

  updateCountdown() {
    const diff = this.hackathon.startDate.getTime() - Date.now();
    if (diff <= 0) { this.countdown.set({ days: 0, hours: 0, minutes: 0, seconds: 0 }); return; }
    this.countdown.set({
      days:    Math.floor(diff / 86_400_000),
      hours:   Math.floor((diff % 86_400_000) / 3_600_000),
      minutes: Math.floor((diff % 3_600_000)  / 60_000),
      seconds: Math.floor((diff % 60_000)     / 1_000),
    });
  }

  get spotsLeft()    { return Math.max(0, this.hackathon.maxTeams - this.hackathon.currentTeams); }
  get spotsPercent() { return this.hackathon.maxTeams ? (this.hackathon.currentTeams / this.hackathon.maxTeams) * 100 : 0; }
  get hasTeamData()  { return this.hackathon.maxTeams > 0; }

  formatDate(date: Date): string {
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  onRegister() { this.register.emit(this.hackathon.id); }
  onSave()     { this.save.emit(this.hackathon.id); }

  pad(n: number): string { return String(n).padStart(2, '0'); }
}
