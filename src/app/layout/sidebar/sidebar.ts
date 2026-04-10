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
    { label: 'Ask Help (Q&A)', icon: 'contact_support',     route: '/qa' },
    { type: 'divider' },
    { label: 'Chat',           icon: 'chat_bubble_outline', route: '/chat', badge: 3 },
    { type: 'divider' },
    { label: 'Teammates',      icon: 'group',               route: '/teams' },
  ];
}
