import { Component, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProfileService } from './profile.service';
import { PostService } from '../../shared/post-card/post.service';
import { ProjectService } from '../projects/project.service';
import { PostCard } from '../../shared/post-card/post-card';
import { ProjectCard } from '../projects/project-card';
import { AuthService } from '../../shared/auth/auth.service';
import { CreatePostModal } from '../../shared/create-post-modal/create-post-modal';

type Tab = 'posts' | 'liked' | 'saved' | 'projects';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [PostCard, ProjectCard, RouterLink, CreatePostModal],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile {
  activeTab = signal<Tab>('posts');
  showCoverPicker = signal(false);
  shareCopied = signal(false);
  showCreatePost = signal(false);

  tabs: { value: Tab; label: string; icon: string }[] = [
    { value: 'posts',    label: 'Posts',    icon: 'grid_view' },
    { value: 'liked',    label: 'Liked',    icon: 'favorite_border' },
    { value: 'saved',    label: 'Saved',    icon: 'bookmark_border' },
    { value: 'projects', label: 'Projects', icon: 'folder_copy' },
  ];

  readonly coverOptions = ['#E8593C', '#6366f1', '#10b981', '#f59e0b', '#ec4899', '#3b82f6', '#8b5cf6', '#14b8a6'];

  constructor(
    public profileService: ProfileService,
    private postService: PostService,
    private projectService: ProjectService,
    private authService: AuthService,
  ) {}

  logout() {
    this.authService.logout();
  }

  selectCoverColor(color: string) {
    this.profileService.updateProfile({ coverColor: color });
    this.showCoverPicker.set(false);
  }

  shareProfile() {
    const url = window.location.origin + '/profile';
    navigator.clipboard.writeText(url).then(() => {
      this.shareCopied.set(true);
      setTimeout(() => this.shareCopied.set(false), 2000);
    });
  }

  profile = computed(() => this.profileService.getProfile());

  myPosts = computed(() =>
    this.postService.getPosts().filter(p => p.author.name === this.profile().name)
  );

  likedPosts = computed(() => this.profileService.getLikedPosts());
  savedPosts = computed(() => this.profileService.getSavedPosts());
  myProjects = computed(() => this.projectService.getProjects().slice(0, 3));
}
