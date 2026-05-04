import { Component, Output, EventEmitter, signal, OnInit } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { TeamService } from './team.service';
import { TeamPost } from './teammates.model';

const API = 'http://localhost:8081/api';

interface HackathonOption { id: number; title: string; }

@Component({
  selector: 'app-create-team-modal',
  standalone: true,
  imports: [],
  templateUrl: './createteam.html',
  styleUrl: './createteam.css',
})
export class CreateTeamModal implements OnInit {
  @Output() close = new EventEmitter<void>();
  @Output() created = new EventEmitter<TeamPost>();

  hackathons = signal<HackathonOption[]>([]);
  selectedHackathonId = signal<number | null>(null);
  title = signal('');
  description = signal('');
  location = signal('');
  techInput = signal('');
  techStack = signal<string[]>([]);
  lookingForInput = signal('');
  lookingFor = signal<string[]>([]);
  maxMembers = signal(4);
  submitting = signal(false);
  error = signal<string | null>(null);

  constructor(
    private http: HttpClient,
    private teamService: TeamService,
  ) {}

  ngOnInit() {
    this.http.get<any[]>(`${API}/hackathons`).subscribe({
      next: (h) => this.hackathons.set(h.map(x => ({ id: x.id, title: x.title }))),
    });
  }

  onHackathonChange(event: Event) {
    const val = +(event.target as HTMLSelectElement).value;
    this.selectedHackathonId.set(val || null);
  }

  addTech() {
    const val = this.techInput().trim();
    if (val && !this.techStack().includes(val)) {
      this.techStack.update(t => [...t, val]);
      this.techInput.set('');
    }
  }

  removeTech(tech: string) { this.techStack.update(t => t.filter(x => x !== tech)); }

  addRole() {
    const val = this.lookingForInput().trim();
    if (val && !this.lookingFor().includes(val)) {
      this.lookingFor.update(r => [...r, val]);
      this.lookingForInput.set('');
    }
  }

  removeRole(role: string) { this.lookingFor.update(r => r.filter(x => x !== role)); }

  onTechKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') { event.preventDefault(); this.addTech(); }
  }

  onRoleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') { event.preventDefault(); this.addRole(); }
  }

  onHackathonInput(e: Event) {
    const val = +(e.target as HTMLSelectElement).value;
    this.selectedHackathonId.set(val || null);
  }
  onTitleInput(e: Event) { this.title.set((e.target as HTMLInputElement).value); }
  onDescInput(e: Event) { this.description.set((e.target as HTMLTextAreaElement).value); }
  onLocationInput(e: Event) { this.location.set((e.target as HTMLInputElement).value); }
  onTechInput(e: Event) { this.techInput.set((e.target as HTMLInputElement).value); }
  onRoleInput(e: Event) { this.lookingForInput.set((e.target as HTMLInputElement).value); }
  onMaxInput(e: Event) { this.maxMembers.set(+(e.target as HTMLInputElement).value); }

  canSubmit() {
    return this.selectedHackathonId() !== null
      && this.title().trim().length >= 5
      && !this.submitting();
  }

  submit() {
    if (!this.canSubmit()) return;
    this.submitting.set(true);
    this.error.set(null);
    this.teamService.create({
      hackathonId: this.selectedHackathonId()!,
      title:       this.title().trim(),
      description: this.description().trim(),
      techStack:   this.techStack(),
      location:    this.location().trim(),
      maxMembers:  this.maxMembers(),
      lookingFor:  this.lookingFor(),
    }).subscribe({
      next:  (team) => { this.submitting.set(false); this.created.emit(team); },
      error: ()     => { this.submitting.set(false); this.error.set('Failed to create team post. Please try again.'); },
    });
  }
}
