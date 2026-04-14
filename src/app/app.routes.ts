import { Routes } from '@angular/router';
import { HomeFeed } from './features/home-feed/home-feed';
import { Projects } from './features/projects/projects';
import { Hackathons } from './features/hackathons/hackathons';
import { Teammates } from './features/find-team/teammates';
import { QA } from './features/qa/qa';
import { Chat } from './features/messages/chat';
import { Profile } from './features/profile/profile';
import { Workspace } from './features/workspace/workspace';
import { MyWorkspaces } from './features/workspace/myworkspace';
import { NotificationDropdown } from './shared/notification-bell/notification-bell';
import { Auth } from './features/auth/auth';
import { authGuard } from './shared/auth/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'feed', pathMatch: 'full' },
  { path: 'login', component: Auth },
  { path: 'feed',          component: HomeFeed,             canActivate: [authGuard] },
  { path: 'projects',      component: Projects,             canActivate: [authGuard] },
  { path: 'hackathons',    component: Hackathons,           canActivate: [authGuard] },
  { path: 'find-team',     component: Teammates,            canActivate: [authGuard] },
  { path: 'chat',          component: Chat,                 canActivate: [authGuard] },
  { path: 'qa',            component: QA,                   canActivate: [authGuard] },
  { path: 'profile',       component: Profile,              canActivate: [authGuard] },
  { path: 'profile/:id',   component: Profile,              canActivate: [authGuard] },
  { path: 'workspace/:id', component: Workspace,            canActivate: [authGuard] },
  { path: 'myworkspaces',  component: MyWorkspaces,         canActivate: [authGuard] },
  { path: 'notifications', component: NotificationDropdown, canActivate: [authGuard] },
];