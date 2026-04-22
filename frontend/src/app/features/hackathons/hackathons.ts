import { Component, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HackathonService } from './hackathons.service';
import { HackathonCard } from './hackathon-card';
import { WebinarCard } from './webinar-card';
import { HackathonCalendar } from './hackathon-calendar';
import { CreateEventModal } from './create-event-modal';

type Tab = 'all' | 'hackathons' | 'webinars';

@Component({
  selector: 'app-hackathons',
  standalone: true,
  imports: [FormsModule, HackathonCard, WebinarCard, HackathonCalendar, CreateEventModal],
  templateUrl: './hackathons.html',
  styleUrl: './hackathons.css',
})
export class Hackathons implements OnInit {

  activeTab    = signal<Tab>('all');
  search       = signal('');
  showModal    = signal(false);

  constructor(private hackathonService: HackathonService) {}

  ngOnInit() { this.hackathonService.loadAll(); }

  // ── Computed filtered lists ───────────────────────────────────────────────

  filteredHackathons = computed(() => {
    const q = this.search().toLowerCase();
    return this.hackathonService.getHackathons().filter(h =>
      !q ||
      h.title.toLowerCase().includes(q) ||
      h.location.toLowerCase().includes(q) ||
      h.tags.some(t => t.toLowerCase().includes(q))
    );
  });

  filteredWebinars = computed(() => {
    const q = this.search().toLowerCase();
    return this.hackathonService.getWebinars().filter(w =>
      !q ||
      w.title.toLowerCase().includes(q) ||
      (w.location ?? '').toLowerCase().includes(q) ||
      w.tags.some(t => t.toLowerCase().includes(q)) ||
      (w.speakerName ?? '').toLowerCase().includes(q)
    );
  });

  totalCount = computed(() => {
    const tab = this.activeTab();
    if (tab === 'hackathons') return this.filteredHackathons().length;
    if (tab === 'webinars')   return this.filteredWebinars().length;
    return this.filteredHackathons().length + this.filteredWebinars().length;
  });

  isLoading = computed(() => this.hackathonService.isLoading());

  // ── Actions ───────────────────────────────────────────────────────────────

  setTab(tab: Tab)  { this.activeTab.set(tab); }
  setSearch(q: string) { this.search.set(q); }

  onSaveHackathon(id: number) { this.hackathonService.toggleSaveHackathon(id); }
  onSaveWebinar(id: number)   { this.hackathonService.toggleSaveWebinar(id);   }
}
