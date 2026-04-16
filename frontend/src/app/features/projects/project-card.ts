import { Component, Input, signal } from '@angular/core';
import { Project } from './project.model';

@Component({
  selector: 'app-project-card',
  standalone: true,
  imports: [],
  templateUrl: './project-card.html',
  styleUrl: './project-card.css',
})
export class ProjectCard {
  @Input() project!: Project;
  @Input()featured = false;

  starred = signal(false)

  toggleStar(){
    this.starred.update(v =>!v)
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
