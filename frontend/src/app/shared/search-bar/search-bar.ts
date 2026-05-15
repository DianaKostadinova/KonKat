import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './search-bar.html',
  styleUrl: './search-bar.css',
})
export class SearchBar {
  query = '';

  constructor(private router: Router) {}

  onSearch() {
    const q = this.query.trim();
    if (q.length < 2) return;
    this.router.navigate(['/search'], { queryParams: { q } });
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') this.onSearch();
  }
}
