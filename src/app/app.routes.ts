import { Routes } from '@angular/router';
import { HomeFeed } from './features/home-feed/home-feed';
import { Projects } from './features/projects/projects';
import { Hackathons } from './features/hackathons/hackathons';
import { Teammates } from './features/find-team/teammates';
import { QA } from './features/qa/qa';
import { Chat } from './features/messages/chat'
import {Profile} from './features/profile/profile';
import {Workspace} from './features/workspace/workspace'
import {MyWorkspaces} from './features/workspace/myworkspace'
import { NotificationBell } from './shared/notification-bell/notification-bell';
export const routes: Routes = [
  { path: '', redirectTo: 'feed', pathMatch: 'full' },
  { path: 'feed', component: HomeFeed },
  { path: 'projects', component: Projects },
  { path: 'hackathons', component: Hackathons },
  { path: 'find-team', component: Teammates },
  { path: 'chat', component: Chat },
  { path: 'qa', component: QA },
  { path: 'profile', component: Profile },
  { path: 'profile/:id', component: Profile },
  { path: 'workspace/:id', component: Workspace },
  { path: 'myworkspaces',     component: MyWorkspaces },
  {path: 'notifications', component: NotificationBell}
];
