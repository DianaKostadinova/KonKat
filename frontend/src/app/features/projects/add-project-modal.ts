import { Component, Output, EventEmitter, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProjectService } from './project.service';

const STATUS_OPTIONS = [
  { value: 'IN_PROGRESS',       icon: 'construction',  label: 'In Progress',      hint: 'Currently building' },
  { value: 'COMPLETED',         icon: 'task_alt',      label: 'Completed',        hint: 'Shipped and done' },
  { value: 'LOOKING_FOR_TEAM',  icon: 'group_add',     label: 'Looking for Team', hint: 'Open to collaborators' },
  { value: 'ARCHIVED',          icon: 'archive',       label: 'Archived',         hint: 'No longer active' },
];

@Component({
  selector: 'app-add-project-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './add-project-modal.html',
  styleUrl: './add-project-modal.css',
})
export class AddProjectModal {
  @Output() closed  = new EventEmitter<void>();
  @Output() created = new EventEmitter<void>();

  // ── State ─────────────────────────────────────────────────────────────────
  saving = signal(false);
  error  = signal('');

  // ── Form fields ───────────────────────────────────────────────────────────
  title       = '';
  description = '';
  githubUrl   = '';
  liveUrl     = '';
  status      = 'IN_PROGRESS';
  imagePreview: string | null = null;

  techStack: string[] = [];
  techInput = '';

  readonly statusOptions = STATUS_OPTIONS;

  constructor(private projectService: ProjectService) {}

  // ── Image upload ──────────────────────────────────────────────────────────

  onImageChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { this.imagePreview = reader.result as string; };
    reader.readAsDataURL(file);
  }

  removeImage(): void {
    this.imagePreview = null;
  }

  // ── Tech stack tag input ──────────────────────────────────────────────────

  addTech(): void {
    const val = this.techInput.trim();
    if (val && !this.techStack.includes(val)) {
      this.techStack = [...this.techStack, val];
    }
    this.techInput = '';
  }

  removeTech(tech: string): void {
    this.techStack = this.techStack.filter(t => t !== tech);
  }

  onTechKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      this.addTech();
    }
  }

  // ── Validation ────────────────────────────────────────────────────────────

  get canSubmit(): boolean {
    return this.title.trim().length > 0 && !this.saving();
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  submit(): void {
    if (!this.canSubmit) return;
    this.saving.set(true);
    this.error.set('');

    this.projectService.createProject({
      title:       this.title.trim(),
      description: this.description.trim() || undefined,
      githubUrl:   this.githubUrl.trim()   || undefined,
      liveUrl:     this.liveUrl.trim()     || undefined,
      imageUrl:    this.imagePreview       ?? undefined,
      status:      this.status,
      techStack:   this.techStack,
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.created.emit();
        this.closed.emit();
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err?.error?.message ?? 'Failed to create project. Please try again.');
      },
    });
  }

  close(): void { this.closed.emit(); }
}
