import { Component, signal, computed, HostListener } from '@angular/core';
import {CommonModule} from '@angular/common';
import { RouterLink, RouterLinkActive, RouterModule } from '@angular/router';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule,RouterModule, ],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  isSearchFocused = signal(false);
  searchQuery = signal('')
  notificationCount = signal(3)
  isMobileMenuOpen = signal(false);

  notificationLabel = computed(() =>{
    const count = this.notificationCount();
    if (count == 0) return null
    return count > 9? '9+':`${count}`
  })

  hasSearchQuery = computed(() => this.searchQuery().length > 0);

  onSearchFocus(){
    this.isSearchFocused.set(true)
  }
  onSearchBlur(){
    this.isSearchFocused.set(false)
  }

  onSearchInput(event: Event){
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }
  clearSearch(){
    this.searchQuery.set("")
  }
  toggleMobileMenu() { this.isMobileMenuOpen.update(v => !v); }
  @HostListener('document:keydown.escape')
  onEscape() {
    this.searchQuery.set('');
    this.isSearchFocused.set(false);
  }

  navLinks = [
    { label: 'Feed',       icon: 'home',             route: '/feed' },
    { label: 'Projects',   icon: 'folder_copy',      route: '/projects' },
    { label: 'Hackathons', icon: 'calendar_month',   route: '/hackathons' },
    { label: 'Teammates',  icon: 'group',            route: '/teammates' },
  ]
}
