import {
  Component, Input, Output, EventEmitter, OnInit, signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

const API = 'http://localhost:8081/api';

export interface FollowUser {
  id: number;
  name: string;
  username: string | null;
  role: string | null;
  avatarUrl: string | null;
  location: string | null;
}

@Component({
  selector: 'app-follow-list-modal',
  standalone: true,
  imports: [],
  template: `
    <!-- Backdrop -->
    <div class="backdrop" (click)="close.emit()"></div>

    <!-- Modal -->
    <div class="modal">

      <!-- Header -->
      <div class="modal-header">
        <h2 class="modal-title">{{ type === 'followers' ? 'Followers' : 'Following' }}</h2>
        <button class="close-btn" (click)="close.emit()">
          <span class="material-icons" style="font-size:20px;">close</span>
        </button>
      </div>

      <!-- Body -->
      <div class="modal-body">

        @if (loading()) {
          <div class="state-center">
            <span class="material-icons spin" style="font-size:28px;color:#555">hourglass_empty</span>
          </div>
        } @else if (users().length === 0) {
          <div class="state-center">
            <span class="material-icons-outlined" style="font-size:40px;color:#2a2a2a">
              {{ type === 'followers' ? 'group' : 'person_search' }}
            </span>
            <p style="color:#555;font-size:13px;margin:8px 0 0;">
              {{ type === 'followers' ? 'No followers yet' : 'Not following anyone yet' }}
            </p>
          </div>
        } @else {
          @for (user of users(); track user.id) {
            <button class="user-row" (click)="openProfile(user.id)">

              <!-- Avatar -->
              <div class="avatar">
                @if (user.avatarUrl) {
                  <img [src]="user.avatarUrl" alt="avatar" />
                } @else {
                  <span class="material-icons" style="font-size:22px;color:#555">account_circle</span>
                }
              </div>

              <!-- Info -->
              <div class="user-info">
                <span class="user-name">{{ user.name }}</span>
                <span class="user-sub">
                  @if (user.username) { &#64;{{ user.username }}{{ user.role || user.location ? ' · ' : '' }} }
                  @if (user.role) { {{ user.role }}{{ user.location ? ' · ' : '' }} }
                  @if (user.location) { {{ user.location }} }
                </span>
              </div>

              <span class="material-icons-outlined go-icon">arrow_forward_ios</span>
            </button>
          }
        }

      </div>
    </div>
  `,
  styles: [`
    .backdrop {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.6);
      z-index: 300;
    }
    .modal {
      position: fixed;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      z-index: 301;
      width: 420px;
      max-width: calc(100vw - 32px);
      max-height: 80vh;
      display: flex;
      flex-direction: column;
      background: #161616;
      border: 1px solid #2a2a2a;
      border-radius: 16px;
      overflow: hidden;
    }
    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid #2a2a2a;
      flex-shrink: 0;
    }
    .modal-title {
      color: #f0f0f0;
      font-size: 15px;
      font-weight: 700;
      margin: 0;
    }
    .close-btn {
      background: none; border: none;
      color: #888; cursor: pointer;
      display: flex; align-items: center;
      padding: 4px; border-radius: 6px;
      transition: color 0.2s, background 0.2s;
    }
    .close-btn:hover { color: #f0f0f0; background: #2a2a2a; }

    .modal-body {
      overflow-y: auto;
      flex: 1;
    }
    .state-center {
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      padding: 40px 16px;
    }
    .user-row {
      display: flex; align-items: center; gap: 12px;
      width: 100%; padding: 12px 20px;
      background: none; border: none;
      cursor: pointer; text-align: left;
      transition: background 0.15s;
    }
    .user-row:hover { background: #1e1e1e; }
    .avatar {
      width: 40px; height: 40px;
      border-radius: 50%;
      background: #2a2a2a;
      border: 1px solid #333;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; overflow: hidden;
    }
    .avatar img { width: 100%; height: 100%; object-fit: cover; }
    .user-info {
      flex: 1; display: flex; flex-direction: column;
      gap: 2px; min-width: 0;
    }
    .user-name {
      color: #f0f0f0; font-size: 14px; font-weight: 600;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .user-sub {
      color: #666; font-size: 12px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .go-icon {
      color: #333; font-size: 14px !important;
      transition: color 0.15s;
    }
    .user-row:hover .go-icon { color: #E8593C; }
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class FollowListModal implements OnInit {
  /** ID of the user whose followers/following we're viewing */
  @Input() userId!: number;
  /** Which list to show */
  @Input() type!: 'followers' | 'following';
  @Output() close = new EventEmitter<void>();

  users   = signal<FollowUser[]>([]);
  loading = signal(true);

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {}

  ngOnInit(): void {
    const url = `${API}/users/${this.userId}/${this.type}`;
    this.http.get<FollowUser[]>(url).subscribe({
      next: (list) => { this.users.set(list); this.loading.set(false); },
      error: ()     => this.loading.set(false),
    });
  }

  openProfile(id: number): void {
    this.close.emit();
    this.router.navigate(['/profile', id]);
  }

}
