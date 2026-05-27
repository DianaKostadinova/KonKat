import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { TeamPost } from './teammates.model';
import { TeamRequestsModal } from './team-requests-modal';
import { WorkspaceService } from '../workspace/workspace.service';
import { environment } from '../../../environments/environment';

const API = environment.apiUrl;

@Component({
  selector: 'app-team-card',
  standalone: true,
  imports: [RouterLink, TeamRequestsModal],
  templateUrl: './team-card.html',
  styleUrl: './team-card.css',
})
export class TeamCard {
  @Input() team!: TeamPost;
  @Output() joinRequest    = new EventEmitter<number>();
  @Output() cancelRequest  = new EventEmitter<number>();
  @Output() membersUpdated = new EventEmitter<number>();

  showMembers       = signal(false);
  showHackathonInfo = signal(false);
  showRequests      = signal(false);
  openingChat       = signal(false);
  openingWorkspace  = signal(false);

  constructor(private http: HttpClient, private router: Router, private workspaceService: WorkspaceService) {}

  toggleMembers()        { this.showMembers.update(v => !v); }
  toggleHackathonInfo()  { this.showHackathonInfo.update(v => !v); }

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

  openChat(): void {
    if (this.openingChat()) return;
    this.openingChat.set(true);
    this.http.post<{ groupId: number }>(`${API}/team-posts/${this.team.id}/chat`, {})
      .subscribe({
        next: ({ groupId }) => {
          this.openingChat.set(false);
          this.router.navigate(['/chat'], { queryParams: { group: groupId } });
        },
        error: () => this.openingChat.set(false),
      });
  }

  openWorkspace(): void {
    if (this.openingWorkspace()) return;
    this.openingWorkspace.set(true);
    this.workspaceService.openFromTeam(this.team.id).subscribe({
      next: ws => {
        this.openingWorkspace.set(false);
        this.router.navigate(['/workspace', ws.id]);
      },
      error: () => this.openingWorkspace.set(false),
    });
  }

  onMembersChanged() {
    // Signal the parent to refresh the team list so member count updates
    this.membersUpdated.emit(this.team.id);
    this.showRequests.set(false);
  }
}
