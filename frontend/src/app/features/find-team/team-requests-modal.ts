import { Component, Input, Output, EventEmitter, signal, OnInit } from '@angular/core';
import { TeamService, TeamRequestDto } from './team.service';

@Component({
  selector: 'app-team-requests-modal',
  standalone: true,
  imports: [],
  templateUrl: './team-requests-modal.html',
})
export class TeamRequestsModal implements OnInit {
  @Input() teamId!: number;
  @Input() teamTitle!: string;
  @Output() close = new EventEmitter<void>();
  @Output() membersChanged = new EventEmitter<void>();

  requests = signal<TeamRequestDto[]>([]);
  loading  = signal(true);
  error    = signal<string | null>(null);
  responding = signal<number | null>(null);   // request id currently being acted on

  constructor(private teamService: TeamService) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.teamService.getRequests(this.teamId).subscribe({
      next:  (r) => { this.requests.set(r); this.loading.set(false); },
      error: ()  => { this.error.set('Failed to load requests'); this.loading.set(false); },
    });
  }

  pending()  { return this.requests().filter(r => r.status === 'pending'); }
  resolved() { return this.requests().filter(r => r.status !== 'pending'); }

  approve(req: TeamRequestDto) { this.respond(req, true); }
  reject(req: TeamRequestDto)  { this.respond(req, false); }

  private respond(req: TeamRequestDto, approve: boolean) {
    this.responding.set(req.id);
    this.teamService.respond(this.teamId, req.id, approve).subscribe({
      next: (updated) => {
        this.requests.update(list =>
          list.map(r => r.id === updated.id ? updated : r)
        );
        this.responding.set(null);
        if (approve) this.membersChanged.emit();
      },
      error: () => this.responding.set(null),
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
    return `${Math.floor(hrs / 24)}d ago`;
  }
}
