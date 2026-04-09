import { Routes } from '@angular/router';
import { HomeFeed } from './features/home-feed/home-feed';
import { Projects } from './features/projects/projects';
import { Hackathons } from './features/hackathons/hackathons';

export const routes: Routes = [
  { path: '', redirectTo: 'feed', pathMatch: 'full' },
  { path: 'feed', component: HomeFeed },
  { path: 'projects', component: Projects },
  { path: 'hackathons', component: Hackathons },
];
