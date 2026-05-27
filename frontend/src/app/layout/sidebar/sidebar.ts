import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar {
  navLinks: any[] = [
    { label: 'Trending',       mobileLabel: 'Trending', icon: 'local_fire_department', route: '/trending' },
    { type: 'divider' },
    { label: 'Ask Help (Q&A)', mobileLabel: 'Q&A',      icon: 'contact_support',       route: '/qa' },
    { type: 'divider' },
    { label: 'Chat',           mobileLabel: 'Chat',     icon: 'chat_bubble_outline',   route: '/chat' },
    { type: 'divider' },
    { label: 'Workspace',      mobileLabel: 'Work',     icon: 'group',                 route: '/myworkspaces' },
    { type: 'divider' },
    { label: 'Minigames',      mobileLabel: 'Games',    icon: 'extension',             route: '/minigames' },
    { type: 'divider' },
    { label: 'Settings',      mobileLabel: 'Settings', icon: 'settings',              route: '/settings' },
  ];
}
