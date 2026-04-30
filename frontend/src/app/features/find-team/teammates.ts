import { Component, signal, computed, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TeamPost } from './teammates.model';
import { TeamService } from './team.service';
import { TeamCard } from './team-card';
import { CreateTeamModal } from './createteam';

@Component({
  selector: 'app-find-team',
  standalone: true,
  imports: [TeamCard, CreateTeamModal],
  templateUrl: './teammates.html',
  styleUrl: './teammates.css',
})
export class Teammates implements OnInit {
  showCreateModal = signal(false);
  searchQuery = signal('');
  selectedHackathon = signal('');
  selectedTech = signal('');
  selectedLocation = signal('');
  teams = signal<TeamPost[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  constructor(
    private teamService: TeamService,
    private route: ActivatedRoute,
  ) {}

  ngOnInit() {
    const hackathon = this.route.snapshot.queryParamMap.get('hackathon');
    if (hackathon) this.selectedHackathon.set(hackathon);
    this.loadTeams();
  }

  loadTeams() {
    this.loading.set(true);
    this.error.set(null);
    this.teamService.getAll().subscribe({
      next:  (teams) => { this.teams.set(teams); this.loading.set(false); },
      error: ()      => { this.error.set('Failed to load team posts'); this.loading.set(false); },
    });
  }

  hackathonOptions = computed(() => {
    const titles = this.teams().map(t => t.hackathon.title);
    return ['All', ...new Set(titles)];
  });

  techOptions = computed(() => {
    const techs = this.teams().flatMap(t => t.techStack);
    return ['All', ...new Set(techs)];
  });

  locationOptions = computed(() => {
    const locs = this.teams().map(t => t.location).filter((l): l is string => !!l);
    return ['All', ...new Set(locs)];
  });

  filteredTeams = computed(() => {
    const q        = this.searchQuery().toLowerCase();
    const hackathon = this.selectedHackathon();
    const tech      = this.selectedTech();
    const location  = this.selectedLocation();

    return this.teams().filter(t => {
      const matchesSearch = !q ||
        t.title.toLowerCase().includes(q) ||
        (t.description ?? '').toLowerCase().includes(q) ||
        t.author.name.toLowerCase().includes(q) ||
        t.techStack.some(s => s.toLowerCase().includes(q));

      const matchesHackathon = !hackathon || hackathon === 'All' ||
        t.hackathon.title === hackathon;

      const matchesTech = !tech || tech === 'All' ||
        t.techStack.some(s => s.toLowerCase().includes(tech.toLowerCase()));

      const matchesLocation = !location || location === 'All' ||
        t.location === location;

      return matchesSearch && matchesHackathon && matchesTech && matchesLocation;
    });
  });

  onSearch(event: Event) {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  setHackathon(event: Event) {
    this.selectedHackathon.set((event.target as HTMLSelectElement).value);
  }

  setTech(event: Event) {
    this.selectedTech.set((event.target as HTMLSelectElement).value);
  }

  setLocation(event: Event) {
    this.selectedLocation.set((event.target as HTMLSelectElement).value);
  }

  onJoinRequest(teamId: number) {
    this.teamService.requestJoin(teamId).subscribe({
      next: (res) => {
        this.teams.update(list =>
          list.map(t => t.id === teamId ? { ...t, requestStatus: res.status as any } : t)
        );
      },
    });
  }

  onCancelRequest(teamId: number) {
    this.teamService.cancelRequest(teamId).subscribe({
      next: (res) => {
        this.teams.update(list =>
          list.map(t => t.id === teamId ? { ...t, requestStatus: res.status as any } : t)
        );
      },
    });
  }

  onTeamCreated(team: TeamPost) {
    this.teams.update(list => [team, ...list]);
    this.showCreateModal.set(false);
  }

  clearFilters() {
    this.searchQuery.set('');
    this.selectedHackathon.set('');
    this.selectedTech.set('');
    this.selectedLocation.set('');
  }
}
