import { Component, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { Hackathon } from './hackathons.model';
import { HackathonService } from './hackathons.service';
import { HackathonCard } from './hackathon-card';
import { HackathonCalendar } from './hackathon-calendar';

@Component({
  selector: 'app-hackathons',
  standalone: true,
  imports: [HackathonCard, HackathonCalendar],
  templateUrl: './hackathons.html',
  styleUrl: './hackathons.css',
})
export class Hackathons {
  constructor(private hackathonService: HackathonService) {}

  hackathons = computed(() => this.hackathonService.getAll());

  onRegister(id: number) {
    this.hackathonService.toggleRegister(id);
  }
}
