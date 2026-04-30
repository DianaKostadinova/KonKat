import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TeamPost } from './teammates.model';

@Component({
  selector: 'app-team-card',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './team-card.html',
  styleUrl: './team-card.css',
})
export class TeamCard {
  @Input() team!: TeamPost;
  @Output() joinRequest   = new EventEmitter<number>();
  @Output() cancelRequest = new EventEmitter<number>();

  showMembers      = signal(false);
  showHackathonInfo = signal(false);

  toggleMembers()       { this.showMembers.update(v => !v); }
  toggleHackathonInfo() { this.showHackathonInfo.update(v => !v); }

  get spotsLeft() {
    return Math.max(0, this.team.maxMembers - this.team.members.length);
  }

  formatDate(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  }

  timeAgo(iso: string): string {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const mins  = Math.floor(diff / 60000);
    if (mins < 1)  return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs  < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }

  onJoin()   { this.joinRequest.emit(this.team.id); }
  onCancel() { this.cancelRequest.emit(this.team.id); }
}
