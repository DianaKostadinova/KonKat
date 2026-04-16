import { Component, signal, effect } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-right-panel',
  standalone: true,
  imports: [],
  templateUrl: './right-panel.html',
  styleUrl: './right-panel.css',
})
export class RightPanel {
  isOpen = signal(false);

  constructor(private router: Router){
    effect(()=>{
      if (this.isOpen()){
        document.body.style.overflow = 'hidden';
      }else{
        document.body.style.overflow = '';
      }
    })
  }

  toggle() {
    this.isOpen.update(v => !v);
  }

  goToFindTeam() {
    this.router.navigate(['/find-team']);
    this.isOpen.set(false);
  }

  currentUser = signal({
    name: 'Diana Kostadinova',
    role: 'Software Engineer @ KonKat',
    location: 'Skopje',
    github: 'diana-dev',
    projects: 14,
    hackathons: 3,
    rep: '1.2k',
  });

  hackathons = signal([
    { dateRange: 'OCT 14 - 16', location: 'OHRID', title: 'CodeFest 2024: AI Innovations', teams: 12 },
    { dateRange: 'NOV 05 - 06', location: 'SKOPJE', title: 'NASA Space Apps Challenge', teams: 8 },
    { dateRange: 'NOV 20 - 22', location: 'BITOLA', title: 'HackMK Winter Edition', teams: 6 },
  ]);

  trending = signal([
    { tag: '#nextjs',     posts: '142 posts' },
    { tag: '#tailwind',   posts: '98 posts' },
    { tag: '#angular',    posts: '76 posts' },
    { tag: '#ui-design',  posts: '64 posts' },
    { tag: '#opensource', posts: '51 posts' },
  ]);
}
