import {Component,signal} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {Navbar} from './layout/navbar/navbar';
import {Sidebar} from './layout/sidebar/sidebar';
import {RightPanel} from './layout/right-panel/right-panel';


@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar, Sidebar, RightPanel],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('KonKat');
}
