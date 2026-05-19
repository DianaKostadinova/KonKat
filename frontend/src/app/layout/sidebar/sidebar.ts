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
    { label: 'Trending',       icon: 'local_fire_department', route: '/trending' },
    { type: 'divider' },
    { label: 'Ask Help (Q&A)', icon: 'contact_support',       route: '/qa' },
    { type: 'divider' },
    { label: 'Chat',           icon: 'chat_bubble_outline',   route: '/chat' },
    { type: 'divider' },
    { label: 'Workspace',      icon: 'group',                 route: '/myworkspaces' },
    { type: 'divider' },
    { label: 'Minigames',      icon: 'extension',             route: '/minigames' },
  ];
}
