import { Component, computed, inject } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { Navbar } from './layout/navbar/navbar';
import { Sidebar } from './layout/sidebar/sidebar';
import { RightPanel } from './layout/right-panel/right-panel';
import { LoadingScreen } from './shared/loading-screen/loading-screen';
import { AuthService } from './shared/auth/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar, Sidebar, RightPanel, LoadingScreen],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private router = inject(Router);
  private auth   = inject(AuthService);

  private currentUrl = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(e => (e as NavigationEnd).urlAfterRedirects),
      startWith(this.router.url)
    )
  );

  isLoading = computed(() => !this.auth.ready());

  showShell = computed(() => {
    const url = this.currentUrl() ?? '';
    return !url.startsWith('/login') && !url.startsWith('/sign-in') && !url.startsWith('/sign-up');
  });
}