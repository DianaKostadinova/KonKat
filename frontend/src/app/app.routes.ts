import { Routes } from '@angular/router';
import { HomeFeed } from './features/home-feed/home-feed';
import { Projects } from './features/projects/projects';
import { Hackathons } from './features/hackathons/hackathons';
import { Teammates } from './features/find-team/teammates';
import { QA } from './features/qa/qa';
import { Chat } from './features/messages/chat';
import { Profile } from './features/profile/profile';
import { EditProfile } from './features/profile/edit-profile/edit-profile';
import { Workspace } from './features/workspace/workspace';
import { MyWorkspaces } from './features/workspace/myworkspace';
import { NotificationDropdown } from './shared/notification-bell/notification-bell';
import { SignIn } from './features/auth/sign-in';
import { SignUp } from './features/auth/sign-up';
import { authGuard } from './shared/auth/auth.guard';
import { Trending } from './features/trending/trending';

export const routes: Routes = [
  { path: '',        redirectTo: 'feed', pathMatch: 'full' },
  { path: 'sign-in', component: SignIn },
  { path: 'sign-up', component: SignUp },
  { path: 'login',   redirectTo: 'sign-in', pathMatch: 'full' },  // backward compat
  { path: 'feed',          component: HomeFeed,             canActivate: [authGuard] },
  { path: 'projects',      component: Projects,             canActivate: [authGuard] },
  { path: 'hackathons',    component: Hackathons,           canActivate: [authGuard] },
  { path: 'find-team',     component: Teammates,            canActivate: [authGuard] },
  { path: 'chat',          component: Chat,                 canActivate: [authGuard] },
  { path: 'qa',            component: QA,                   canActivate: [authGuard] },
  { path: 'profile',       component: Profile,              canActivate: [authGuard] },
  { path: 'profile/edit',  component: EditProfile,          canActivate: [authGuard] },
  { path: 'profile/:id',   component: Profile,              canActivate: [authGuard] },
  { path: 'workspace/:id', component: Workspace,            canActivate: [authGuard] },
  { path: 'myworkspaces',  component: MyWorkspaces,         canActivate: [authGuard] },
  { path: 'notifications', component: NotificationDropdown, canActivate: [authGuard] },
  { path: 'trending',     component: Trending,             canActivate: [authGuard] },
];
