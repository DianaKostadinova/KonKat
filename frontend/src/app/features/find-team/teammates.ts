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

  constructor(
    private teamService: TeamService,
    private route: ActivatedRoute,
  ) {}

  ngOnInit() {
    // Pre-select hackathon from query param (comes from hackathon card "Find Team" button)
    const hackathon = this.route.snapshot.queryParamMap.get('hackathon');
    if (hackathon) this.selectedHackathon.set(hackathon);
  }

  allTeams = computed(() => this.teamService.getAll());

  // Unique filter options from data
  hackathonOptions = computed(() => {
    const titles = this.allTeams().map(t => t.hackathon.title);
    return ['All', ...new Set(titles)];
  });

  techOptions = computed(() => {
    const techs = this.allTeams().flatMap(t => t.techStack);
    return ['All', ...new Set(techs)];
  });

  locationOptions = computed(() => {
    const locs = this.allTeams().map(t => t.location);
    return ['All', ...new Set(locs)];
  });

  filteredTeams = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const hackathon = this.selectedHackathon();
    const tech = this.selectedTech();
    const location = this.selectedLocation();

    return this.allTeams().filter(t => {
      const matchesSearch = !q ||
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
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
    this.teamService.requestJoin(teamId);
  }

  onCancelRequest(teamId: number) {
    this.teamService.cancelRequest(teamId);
  }

  clearFilters() {
    this.searchQuery.set('');
    this.selectedHackathon.set('');
    this.selectedTech.set('');
    this.selectedLocation.set('');
  }
}
