import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Hackathon } from './hackathons.model';
import { RegisterEventModal } from './register-event-modal';

@Component({
  selector: 'app-hackathon-card',
  standalone: true,
  imports: [RegisterEventModal],
  templateUrl: './hackathon-card.html',
  styleUrl: './hackathon-card.css',
})
export class HackathonCard implements OnInit, OnDestroy {
  @Input() hackathon!: Hackathon;
  @Output() save = new EventEmitter<number>();

  countdown   = signal({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  showRegModal = signal(false);

  private timer: any;

  constructor(private router: Router) {}

  ngOnInit() {
    this.updateCountdown();
    this.timer = setInterval(() => this.updateCountdown(), 1000);
  }

  ngOnDestroy() { clearInterval(this.timer); }

  isTBD(): boolean {
    return this.hackathon.startDate.getFullYear() === 2099;
  }

  hasStarted(): boolean {
    return !this.isTBD() && this.hackathon.startDate.getTime() <= Date.now();
  }

  updateCountdown() {
    if (this.isTBD() || this.hasStarted()) {
      this.countdown.set({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      return;
    }
    const diff = this.hackathon.startDate.getTime() - Date.now();
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

  onSave()      { this.save.emit(this.hackathon.id); }
  openRegister(){ this.showRegModal.set(true); }

  /** Navigate to find-team pre-filtered by this hackathon's title */
  goToFindTeam() {
    this.router.navigate(['/find-team'], { queryParams: { hackathon: this.hackathon.title } });
  }

  pad(n: number): string { return String(n).padStart(2, '0'); }
}
