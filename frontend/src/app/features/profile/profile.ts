import { Component, signal, computed, OnInit } from '@angular/core';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { ProfileService } from './profile.service';
import { ProjectService } from '../projects/project.service';
import { PostCard } from '../../shared/post-card/post-card';
import { ProjectCard } from '../projects/project-card';
import { AuthService } from '../../shared/auth/auth.service';
import { FollowService } from '../../shared/follow/follow.service';
import { FollowListModal } from '../../shared/follow/follow-list-modal';
import { CreatePostModal } from '../../shared/create-post-modal/create-post-modal';
import { AddProjectModal } from '../projects/add-project-modal';

type Tab = 'posts' | 'liked' | 'saved' | 'projects';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [PostCard, ProjectCard, RouterLink, CreatePostModal, FollowListModal, AddProjectModal],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile implements OnInit {
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

  // True when the profile shown belongs to the logged-in user
  isOwnProfile = true;
  // The user ID being viewed (may differ from the logged-in user)
  viewedUserId: number | null = null;

  tabs: { value: Tab; label: string; icon: string }[] = [
    { value: 'posts',    label: 'Posts',    icon: 'grid_view' },
    { value: 'liked',    label: 'Liked',    icon: 'favorite_border' },
    { value: 'saved',    label: 'Saved',    icon: 'bookmark_border' },
    { value: 'projects', label: 'Projects', icon: 'folder_copy' },
  ];

  constructor(
    public  profileService: ProfileService,
    private projectService: ProjectService,
    public  authService: AuthService,
    private followService: FollowService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    // Read optional :id param from the route
    const paramId = this.route.snapshot.paramMap.get('id');
    const currentUserId = this.authService.user()?.id;

    if (paramId && Number(paramId) !== currentUserId) {
      // ── Viewing someone else's profile ────────────────────────────────────
      this.isOwnProfile = false;
      this.viewedUserId = Number(paramId);

      this.profileService.loadPublicProfile(this.viewedUserId).subscribe({
        next: (p) => this.isFollowing.set(p.isFollowing ?? false),
      });

      this.profileService.loadMyPosts(this.viewedUserId);
      this.projectService.loadUserProjects(this.viewedUserId);

    } else {
      // ── Viewing own profile ───────────────────────────────────────────────
      this.isOwnProfile = true;
      this.viewedUserId = currentUserId ?? null;

      this.profileService.loadProfile().subscribe();

      if (currentUserId) {
        this.profileService.loadMyPosts(currentUserId);
        this.projectService.loadMyProjects();
      }
    }
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
    const userId = this.viewedUserId ?? this.authService.user()?.id;
    if (tab === 'saved'    && this.isOwnProfile)  this.profileService.loadSavedPosts();
    if (tab === 'liked'    && this.isOwnProfile)  this.profileService.loadLikedPosts();
    if (tab === 'posts'    && userId)             this.profileService.loadMyPosts(userId);
    if (tab === 'projects' && userId) {
      this.isOwnProfile
        ? this.projectService.loadMyProjects()
        : this.projectService.loadUserProjects(userId);
    }
  }

  onProjectCreated(): void {
    // Reload after creation so the list is fresh
    this.projectService.loadMyProjects();
  }

  // ── Other actions ─────────────────────────────────────────────────────────

  messageUser(): void {
    if (!this.viewedUserId) return;
    this.router.navigate(['/chat'], { queryParams: { dm: this.viewedUserId } });
  }

  logout(): void { this.authService.logout(); }

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
}
