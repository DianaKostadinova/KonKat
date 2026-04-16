import { Component, Output, EventEmitter, signal } from '@angular/core';

@Component({
  selector: 'app-create-team-modal',
  standalone: true,
  imports: [],
  templateUrl: './createteam.html',
  styleUrl: './createteam.css',
})
export class CreateTeamModal {
  @Output() close = new EventEmitter<void>();

  title = signal('');
  description = signal('');
  techInput = signal('');
  techStack = signal<string[]>([]);
  lookingForInput = signal('');
  lookingFor = signal<string[]>([]);
  maxMembers = signal(4);

  addTech() {
    const val = this.techInput().trim();
    if (val && !this.techStack().includes(val)) {
      this.techStack.update(t => [...t, val]);
      this.techInput.set('');
    }
  }

  removeTech(tech: string) {
    this.techStack.update(t => t.filter(x => x !== tech));
  }

  addRole() {
    const val = this.lookingForInput().trim();
    if (val && !this.lookingFor().includes(val)) {
      this.lookingFor.update(r => [...r, val]);
      this.lookingForInput.set('');
    }
  }

  removeRole(role: string) {
    this.lookingFor.update(r => r.filter(x => x !== role));
  }

  onTechKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') { event.preventDefault(); this.addTech(); }
  }

  onRoleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') { event.preventDefault(); this.addRole(); }
  }

  onTitleInput(e: Event) { this.title.set((e.target as HTMLInputElement).value); }
  onDescInput(e: Event) { this.description.set((e.target as HTMLTextAreaElement).value); }
  onTechInput(e: Event) { this.techInput.set((e.target as HTMLInputElement).value); }
  onRoleInput(e: Event) { this.lookingForInput.set((e.target as HTMLInputElement).value); }
  onMaxInput(e: Event) { this.maxMembers.set(+(e.target as HTMLInputElement).value); }

  submit() {
    this.close.emit();
  }
}
