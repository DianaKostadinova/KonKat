import { Component, signal, computed } from '@angular/core';
import { Project } from './project.model';
import { ProjectService } from './project.service';
import { ProjectCard } from './project-card';
import { AddProjectModal } from './add-project-modal';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [ProjectCard, AddProjectModal],
  templateUrl: './projects.html',
  styleUrl: './projects.css',
})
export class Projects {
  selectedTech = signal('');
  selectedSort = signal('newest');
  searchQuery = signal('');
  showSuggestions = signal(false);
  showSortMenu = signal(false);
  showAddModal = signal(false);

  techFilters = ['All', 'Angular', 'React', 'Next.js', 'TypeScript', 'Python', 'Node.js'];
  sortOptions = [
    { value: 'newest',   label: 'Newest' },
    { value: 'popular',  label: 'Most Stars' },
    { value: 'discussed', label: 'Most Discussed' },
  ];

  constructor(private projectService: ProjectService) {}

  allProjects = computed(() => this.projectService.getProjects());

  currentSortLabel = computed(() =>
    this.sortOptions.find(o => o.value === this.selectedSort())?.label ?? 'Sort'
  );

  suggestions = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q || q.length < 2) return [];

    const results: { type: 'title' | 'author' | 'tech'; value: string; project?: Project }[] = [];
    const seen = new Set<string>();

    this.allProjects().forEach(p => {

      if (p.title.toLowerCase().includes(q)) {
        const key = `title:${p.title}`;
        if (!seen.has(key)) {
          results.push({ type: 'title', value: p.title, project: p });
          seen.add(key);
        }
      }

      if (p.author.name.toLowerCase().includes(q)) {
        const key = `author:${p.author.name}`;
        if (!seen.has(key)) {
          results.push({ type: 'author', value: p.author.name });
          seen.add(key);
        }
      }

      p.techStack.forEach(tech => {
        if (tech.toLowerCase().includes(q)) {
          const key = `tech:${tech}`;
          if (!seen.has(key)) {
            results.push({ type: 'tech', value: tech });
            seen.add(key);
          }
        }
      });
    });

    return results.slice(0, 6); // max 6 suggestions
  });

  // Final filtered + sorted list
  filteredProjects = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const tech = this.selectedTech() === 'All' ? '' : this.selectedTech();

    let projects = this.allProjects().filter(p => {
      // Tech filter
      const matchesTech = !tech ||
        p.techStack.some(t => t.toLowerCase().includes(tech.toLowerCase()));

      const matchesSearch = !q ||
        p.title.toLowerCase().includes(q) ||
        p.author.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.techStack.some(t => t.toLowerCase().includes(q));

      return matchesTech && matchesSearch;
    });

    return this.projectService.sortBy(projects, this.selectedSort());
  });

  featured = computed(() =>
    this.filteredProjects().filter(p => p.featured)
  );

  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
    this.showSuggestions.set(true);
  }

  selectSuggestion(suggestion: { type: string; value: string }) {
    if (suggestion.type === 'tech') {
      this.selectedTech.set(suggestion.value);
      this.searchQuery.set('');
    } else {
      this.searchQuery.set(suggestion.value);
    }
    this.showSuggestions.set(false);
  }

  onSearchFocus() {
    this.showSuggestions.set(true);
  }

  onSearchBlur() {

    setTimeout(() => this.showSuggestions.set(false), 150);
  }

  setTech(tech: string) {
    this.selectedTech.set(tech === 'All' ? '' : tech);
  }

  setSort(value: string) {
    this.selectedSort.set(value);
    this.showSortMenu.set(false);
  }

  toggleSortMenu() {
    this.showSortMenu.update(v => !v);
  }

  closeSortMenu() {
    setTimeout(() => this.showSortMenu.set(false), 150);
  }

  openAddModal() { this.showAddModal.set(true); }
  closeAddModal() { this.showAddModal.set(false); }

  onProjectCreated() {
    this.closeAddModal();
  }

  clearSearch() {
    this.searchQuery.set('');
    this.selectedTech.set('');
    this.showSuggestions.set(false);
  }

  suggestionIcon(type: string): string {
    switch (type) {
      case 'title':  return 'folder_copy';
      case 'author': return 'account_circle';
      case 'tech':   return 'code';
      default:       return 'search';
    }
  }
}
