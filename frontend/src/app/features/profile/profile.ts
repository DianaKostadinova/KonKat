import { Component, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ProfileService } from './profile.service';
import { ProjectService } from '../projects/project.service';
import { PostCard } from '../../shared/post-card/post-card';
import { ProjectCard } from '../projects/project-card';
import { AuthService } from '../../shared/auth/auth.service';
import { FollowService } from '../../shared/follow/follow.service';
import { FollowListModal } from '../../shared/follow/follow-list-modal';
import { CreatePostModal } from '../../shared/create-post-modal/create-post-modal';
import { AddProjectModal } from '../projects/add-project-modal';
import { EventService } from '../../shared/event/event.service';
import { HackathonService } from '../hackathons/hackathons.service';
import { EventWithCountdown, SavedEvent } from '../../shared/event/saved-event.model';

type Tab = 'posts' | 'liked' | 'saved' | 'projects' | 'events';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [PostCard, ProjectCard, RouterLink, CreatePostModal, FollowListModal, AddProjectModal, DatePipe],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile implements OnInit, OnDestroy {
  activeTab      = signal<Tab>('posts');
  shareCopied    = signal(false);
  showCreatePost = signal(false);

  // Follow state — only relevant when viewing someone else's profile
  isFollowing   = signal(false);
  followLoading = signal(false);

  // Follow list modal
  followListOpen = signal(false);
  followListType = signal<'followers' | 'following'>('followers');

  // Add project modal
  showAddProject = signal(false);

  showLogoutConfirm = signal(false);

  isOwnProfile = true;
  viewedUserId: number | null = null;

  private routeSub?: Subscription;

  tabs: { value: Tab; label: string; icon: string }[] = [
    { value: 'posts',    label: 'Posts',    icon: 'grid_view' },
    { value: 'liked',    label: 'Liked',    icon: 'favorite_border' },
    { value: 'saved',    label: 'Saved',    icon: 'bookmark_border' },
    { value: 'projects', label: 'Projects', icon: 'folder_copy' },
    { value: 'events',   label: 'Events',   icon: 'calendar_month' },
  ];

  savedEvents  = signal<SavedEvent[]>([]);
  registeredEvents = signal<EventWithCountdown[]>([]);

  constructor(
    public  profileService: ProfileService,
    private projectService: ProjectService,
    public  authService: AuthService,
    private followService: FollowService,
    private route: ActivatedRoute,
    private router: Router,
    private eventService: EventService,
    private hackathonService: HackathonService,
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(qp => {
      const tab = qp.get('tab') as Tab | null;
      if (tab && this.tabs.some(t => t.value === tab)) {
        this.activeTab.set(tab);
        if (tab === 'events') this.loadEvents();
      }
    });

    this.routeSub = this.route.paramMap.subscribe(params => {
      const paramId = params.get('id');
      const currentDbId = this.authService.user()?.dbId;

      // Reset tab to posts on every navigation (unless query param overrides)
      if (!this.route.snapshot.queryParamMap.get('tab')) {
        this.activeTab.set('posts');
      }

      if (paramId && Number(paramId) !== currentDbId) {
        // ── Viewing someone else's profile ──────────────────────────────────
        this.isOwnProfile = false;
        this.viewedUserId = Number(paramId);

        this.profileService.loadPublicProfile(this.viewedUserId).subscribe({
          next: (p) => this.isFollowing.set(p.isFollowing ?? false),
        });

        this.profileService.loadMyPosts(this.viewedUserId);
        this.projectService.loadUserProjects(this.viewedUserId);

      } else {
        // ── Viewing own profile ─────────────────────────────────────────────
        this.isOwnProfile = true;

        this.profileService.loadProfile().subscribe({
          next: profile => {
            this.viewedUserId = profile.id;
            this.profileService.loadMyPosts(profile.id);
            this.projectService.loadMyProjects();
          },
        });
      }
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }

  // ── Follow toggle ─────────────────────────────────────────────────────────

  toggleFollow(): void {
    if (!this.viewedUserId || this.followLoading()) return;
    this.followLoading.set(true);

    this.followService.toggle(this.viewedUserId).subscribe({
      next: (result) => {
        this.isFollowing.set(result.following);
        this.profileService.updateProfile({
          stats: { ...this.profile().stats, followers: result.followerCount },
        });
        this.followLoading.set(false);
      },
      error: () => this.followLoading.set(false),
    });
  }

  // ── Follow list modal ─────────────────────────────────────────────────────

  openFollowList(type: 'followers' | 'following'): void {
    this.followListType.set(type);
    this.followListOpen.set(true);
  }

  // ── Tab switching ─────────────────────────────────────────────────────────

  setTab(tab: Tab): void {
    this.activeTab.set(tab);
    const userId = this.viewedUserId ?? this.profileService.getProfile().id;
    if (tab === 'saved'    && this.isOwnProfile)  this.profileService.loadSavedPosts();
    if (tab === 'liked'    && this.isOwnProfile)  this.profileService.loadLikedPosts();
    if (tab === 'posts'    && userId)             this.profileService.loadMyPosts(userId);
    if (tab === 'events'   && this.isOwnProfile)  this.loadEvents();
    if (tab === 'projects' && userId) {
      this.isOwnProfile
        ? this.projectService.loadMyProjects()
        : this.projectService.loadUserProjects(userId);
    }
  }

  private loadEvents(): void {
    this.eventService.getSavedUpcoming().subscribe({
      next: list => this.savedEvents.set(list),
      error: () => {},
    });
    this.hackathonService.getRegisteredUpcoming().subscribe({
      next: list => this.registeredEvents.set(list.map(h => ({
        id:        h.id,
        type:      'HACKATHON' as const,
        title:     h.title,
        startDate: h.startDate ?? null,
        endDate:   h.endDate   ?? null,
        location:  h.location  ?? null,
        tags:      h.tags      ?? [],
        countdown: null,
      }))),
      error: () => {},
    });
  }

  allEvents = computed<SavedEvent[]>(() => {
    const saved = this.savedEvents();
    const registered = this.registeredEvents();
    const savedIds = new Set(saved.map(e => `${e.id}|${e.type}`));
    const extra = registered.filter(e => !savedIds.has(`${e.id}|${e.type}`));
    return [...saved, ...extra].sort((a, b) => {
      if (!a.startDate) return 1;
      if (!b.startDate) return -1;
      return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    });
  });

  onProjectCreated(): void {
    // Reload after creation so the list is fresh
    this.projectService.loadMyProjects();
  }

  // ── Other actions ─────────────────────────────────────────────────────────

  messageUser(): void {
    if (!this.viewedUserId) return;
    this.router.navigate(['/chat'], { queryParams: { dm: this.viewedUserId } });
  }

  logout(): void {
    this.showLogoutConfirm.set(true);
  }

  confirmLogout(): void {
    this.authService.logout().then(() => this.router.navigate(['/sign-in']));
  }

  onCoverImageChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      this.profileService.updateProfile({ coverImage: reader.result as string });
    };
    reader.readAsDataURL(file);
  }

  shareProfile(): void {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      this.shareCopied.set(true);
      setTimeout(() => this.shareCopied.set(false), 2000);
    });
  }

  // ── Template helpers ──────────────────────────────────────────────────────

  profile    = computed(() => this.profileService.getProfile());
  myPosts    = computed(() => this.profileService.getMyPosts());
  likedPosts = computed(() => this.profileService.getLikedPosts());
  savedPosts = computed(() => this.profileService.getSavedPosts());
  myProjects = computed(() => this.projectService.getProjects());

  ensureHttps(url: string | undefined): string {
    if (!url) return '';
    return url.startsWith('http') ? url : 'https://' + url;
  }
}
