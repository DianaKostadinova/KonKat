import { Component, signal, computed } from '@angular/core';
import { ProfileService } from './profile.service';
import { PostService } from '../../shared/post-card/post.service';
import { ProjectService } from '../projects/project.service';
import { PostCard } from '../../shared/post-card/post-card';
import { ProjectCard } from '../projects/project-card';

type Tab = 'posts' | 'liked' | 'saved' | 'projects';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [PostCard, ProjectCard],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile {
  activeTab = signal<Tab>('posts');

  tabs: { value: Tab; label: string; icon: string }[] = [
    { value: 'posts',    label: 'Posts',    icon: 'grid_view' },
    { value: 'liked',    label: 'Liked',    icon: 'favorite_border' },
    { value: 'saved',    label: 'Saved',    icon: 'bookmark_border' },
    { value: 'projects', label: 'Projects', icon: 'folder_copy' },
  ];

  constructor(
    public profileService: ProfileService,
    private postService: PostService,
    private projectService: ProjectService,
  ) {}

  profile = computed(() => this.profileService.getProfile());
  myPosts = computed(() => this.postService.getPosts());
  likedPosts = computed(() => this.profileService.getLikedPosts());
  savedPosts = computed(() => this.profileService.getSavedPosts());
  myProjects = computed(() => this.projectService.getProjects().slice(0, 3));
}
