import { Component, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TeamService } from '../find-team/team.service';

@Component({
  selector: 'app-my-workspaces',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="flex flex-col gap-4 p-4 max-w-2xl mx-auto w-full">

      <div>
        <h1 class="text-[#f0f0f0] text-xl font-bold m-0">My Workspaces</h1>
        <p class="text-[#888888] text-sm m-0">Teams you are part of</p>
      </div>

      @for (team of myTeams(); track team.id) {
        <div class="flex flex-col gap-3 rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-4">
          <div class="flex items-start justify-between">
            <div class="flex flex-col gap-1">
              <span class="text-[#f0f0f0] text-sm font-semibold">{{ team.title }}</span>
              <div class="flex items-center gap-1.5 text-[#888888] text-xs">
                <span class="material-icons-outlined" style="font-size: 14px;">emoji_events</span>
                {{ team.hackathon.title }} · {{ team.hackathon.city }}
              </div>
            </div>
            <span class="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-[#28c840]/10 text-[#28c840] border border-[#28c840]/30">
              <span class="material-icons" style="font-size: 12px;">check_circle</span>
              MEMBER
            </span>
          </div>

          <div class="flex flex-wrap gap-1.5">
            @for (tech of team.techStack; track tech) {
              <span class="rounded-md px-2 py-0.5 text-[11px] bg-[#2a2a2a] text-[#888888] border border-[#3a3a3a]">
                {{ tech }}
              </span>
            }
          </div>

          <button
            class="flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium text-white bg-[#E8593C] border-none cursor-pointer hover:bg-[#d04a2e] transition-all"
            [routerLink]="['/workspace', team.id]"
          >
            <span class="material-icons-outlined" style="font-size: 16px;">rocket_launch</span>
            Open Workspace
          </button>
        </div>
      }

      @if (myTeams().length === 0) {
        <div class="flex flex-col items-center gap-3 py-16 text-center">
          <span class="material-icons text-[#2a2a2a]" style="font-size: 48px;">rocket_launch</span>
          <p class="text-[#888888] text-sm m-0">You are not in any teams yet</p>
          <button
            class="text-[#E8593C] text-xs hover:underline bg-transparent border-none cursor-pointer"
            routerLink="/teammates"
          >
            Find a team →
          </button>
        </div>
      }

    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: calc(100vh - 60px);
      overflow-y: auto;
    }
  `]
})
export class MyWorkspaces {
  constructor(private teamService: TeamService) {}

  // Only show approved teams
  myTeams = computed(() =>
    this.teamService.getAll().filter(t => t.requestStatus === 'approved')
  );
}
