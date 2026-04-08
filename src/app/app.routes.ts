import { Routes } from '@angular/router';
import {HomeFeed} from './features/home-feed/home-feed';

export const routes: Routes = [
  { path: '', redirectTo: 'feed', pathMatch: 'full' },
  { path: 'feed', component: HomeFeed }
];
