import { Component, Input, signal, computed, OnChanges, SimpleChanges } from '@angular/core';
import { Project } from './project.model';
import { ProjectService } from './project.service';

@Component({
  selector: 'app-project-card',
  standalone: true,
  imports: [],
  templateUrl: './project-card.html',
  styleUrl: './project-card.css',
})
export class ProjectCard implements OnChanges {
  @Input() project!: Project;
  @Input() featured = false;

  /** Local copies so the star button reacts instantly while the HTTP call is in flight. */
  starred   = signal(false);
  starCount = signal(0);
  saving    = signal(false);

  constructor(private projectService: ProjectService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['project']) {
      this.starred.set(this.project?.starred ?? false);
      this.starCount.set(this.project?.stars ?? 0);
    }
  }

  toggleStar() {
    if (this.saving() || !this.project) return;
    this.saving.set(true);
    // Optimistic local toggle — service does the same on its signal, so both stay in sync.
    const next = !this.starred();
    this.starred.set(next);
    this.starCount.update(c => next ? c + 1 : Math.max(0, c - 1));
    this.projectService.toggleStar(this.project.id).subscribe({
      next: res => {
        this.starred.set(res.starred);
        this.starCount.set(res.starCount);
        this.saving.set(false);
      },
      error: () => {
        // Roll back the optimistic update on failure.
        this.starred.set(!next);
        this.starCount.update(c => next ? Math.max(0, c - 1) : c + 1);
        this.saving.set(false);
      },
    });
  }

  openGithub() {
    if (this.project.githubUrl) {
      window.open(this.project.githubUrl, '_blank');
    }
  }
  openLive() {
    if (this.project.liveUrl) {
      window.open(this.project.liveUrl, '_blank');
    }
  }
}
