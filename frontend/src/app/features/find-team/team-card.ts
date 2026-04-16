import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { TeamPost } from './teammates.model';
import {RouterLink, Route} from '@angular/router';
@Component({
  selector: 'app-team-card',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './team-card.html',
  styleUrl: './team-card.css',
})
export class TeamCard {
  @Input() team!: TeamPost;
  @Output() joinRequest = new EventEmitter<number>();
  @Output() cancelRequest = new EventEmitter<number>();

  showMembers = signal(false);
  showHackathonInfo = signal(false);

  toggleMembers() { this.showMembers.update(v => !v); }
  toggleHackathonInfo() { this.showHackathonInfo.update(v => !v); }

  get spotsLeft() {
    return this.team.maxMembers - this.team.members.length;
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  }

  onJoin() { this.joinRequest.emit(this.team.id); }
  onCancel() { this.cancelRequest.emit(this.team.id); }
}
