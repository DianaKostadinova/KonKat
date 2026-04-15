import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProfileService } from '../profile.service';
import { UserProfile } from '../profile.model';

@Component({
  selector: 'app-edit-profile',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './edit-profile.html',
  styleUrl: './edit-profile.css',
})
export class EditProfile implements OnInit {
  isSetup = signal(false);

  // Form fields
  name = '';
  username = '';
  role = '';
  company = '';
  location = '';
  bio = '';
  github = '';
  website = '';
  avatar = '';
  coverColor = '#E8593C';

  // Tag inputs
  techStack: string[] = [];
  interests: string[] = [];
  techInput = '';
  interestInput = '';

  constructor(
    private profileService: ProfileService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit() {
    this.isSetup.set(this.route.snapshot.queryParamMap.get('setup') === 'true');

    const p = this.profileService.getProfile();
    this.name = p.name;
    this.username = p.username;
    this.role = p.role;
    this.company = p.company;
    this.location = p.location;
    this.bio = p.bio;
    this.github = p.github;
    this.website = p.website ?? '';
    this.avatar = p.avatar ?? '';
    this.coverColor = p.coverColor;
    this.techStack = [...p.techStack];
    this.interests = [...p.interests];
  }

  onAvatarChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { this.avatar = reader.result as string; };
    reader.readAsDataURL(file);
  }

  addTech() {
    const val = this.techInput.trim();
    if (val && !this.techStack.includes(val)) {
      this.techStack = [...this.techStack, val];
    }
    this.techInput = '';
  }

  removeTech(tech: string) {
    this.techStack = this.techStack.filter(t => t !== tech);
  }

  onTechKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      this.addTech();
    }
  }

  addInterest() {
    const val = this.interestInput.trim();
    if (val && !this.interests.includes(val)) {
      this.interests = [...this.interests, val];
    }
    this.interestInput = '';
  }

  removeInterest(interest: string) {
    this.interests = this.interests.filter(i => i !== interest);
  }

  onInterestKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      this.addInterest();
    }
  }

  save() {
    const updates: Partial<UserProfile> = {
      name: this.name.trim(),
      username: this.username.trim(),
      role: this.role.trim(),
      company: this.company.trim(),
      location: this.location.trim(),
      bio: this.bio.trim(),
      github: this.github.trim(),
      website: this.website.trim() || undefined,
      avatar: this.avatar || undefined,
      coverColor: this.coverColor,
      techStack: this.techStack,
      interests: this.interests,
    };
    this.profileService.updateProfile(updates);
    this.router.navigate(this.isSetup() ? ['/feed'] : ['/profile']);
  }

  cancel() {
    this.router.navigate(this.isSetup() ? ['/feed'] : ['/profile']);
  }

  readonly coverOptions = ['#E8593C', '#6366f1', '#10b981', '#f59e0b', '#ec4899', '#3b82f6', '#8b5cf6', '#14b8a6'];
}