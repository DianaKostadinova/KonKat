import { Component, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { WorkspaceService } from './workspace.service';

@Component({
  selector: 'app-my-workspaces',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="flex flex-col gap-4 p-4 max-w-2xl mx-auto w-full">

      <div class="flex items-start justify-between">
        <div>
          <h1 class="text-[#f0f0f0] text-xl font-bold m-0">My Workspaces</h1>
          <p class="text-[#888888] text-sm m-0">Teams and groups you are part of</p>
        </div>
        <button
          class="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-white bg-[#E8593C] border-none cursor-pointer hover:bg-[#d04a2e] transition-all"
          (click)="showCreate.set(true)"
        >
          <span class="material-icons" style="font-size: 16px;">add</span>
          New Workspace
        </button>
      </div>

      <!-- Create workspace modal -->
      @if (showCreate()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60" (click)="showCreate.set(false)">
          <div class="flex flex-col gap-4 rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] p-6 w-80"
               (click)="$event.stopPropagation()">
            <h2 class="text-[#f0f0f0] text-base font-bold m-0">Create Workspace</h2>
            <input
              class="bg-[#111111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-[#f0f0f0] outline-none focus:border-[#E8593C] transition-colors placeholder-[#888888]"
              placeholder="Workspace name..."
              [value]="newName()"
              (input)="newName.set($any($event.target).value)"
            />
            <div class="flex gap-2">
              <button
                class="flex-1 rounded-lg py-2 text-sm font-medium text-white bg-[#E8593C] border-none cursor-pointer hover:bg-[#d04a2e] transition-all"
                (click)="createWorkspace()"
              >Create</button>
              <button
                class="flex-1 rounded-lg py-2 text-sm text-[#888888] bg-transparent border border-[#2a2a2a] cursor-pointer hover:text-[#f0f0f0] transition-all"
                (click)="showCreate.set(false)"
              >Cancel</button>
            </div>
          </div>
        </div>
      }

      @if (svc.loading()) {
        <div class="flex items-center justify-center py-16">
          <span class="text-[#888888] text-sm">Loading workspaces...</span>
        </div>
      }

      @for (ws of svc.summaries(); track ws.id) {
        <div class="flex flex-col gap-3 rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-4">
          <div class="flex items-start justify-between">
            <div class="flex flex-col gap-1">
              <span class="text-[#f0f0f0] text-sm font-semibold">{{ ws.name }}</span>
              @if (ws.hackathonTitle) {
                <div class="flex items-center gap-1.5 text-[#888888] text-xs">
                  <span class="material-icons-outlined" style="font-size: 14px;">emoji_events</span>
                  {{ ws.hackathonTitle }}
                </div>
              } @else {
                <div class="flex items-center gap-1.5 text-[#888888] text-xs">
                  <span class="material-icons-outlined" style="font-size: 14px;">group</span>
                  Personal group
                </div>
              }
            </div>
            <span class="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-[#28c840]/10 text-[#28c840] border border-[#28c840]/30">
              <span class="material-icons" style="font-size: 12px;">check_circle</span>
              MEMBER
            </span>
          </div>

          <div class="grid grid-cols-3 gap-2">
            <div class="flex flex-col items-center rounded-lg bg-[#111111] py-2">
              <span class="text-[#f0f0f0] text-sm font-bold">{{ ws.memberCount }}</span>
              <span class="text-[#888888] text-[11px]">Members</span>
            </div>
            <div class="flex flex-col items-center rounded-lg bg-[#111111] py-2">
              <span class="text-[#28c840] text-sm font-bold">{{ ws.doneCount }}</span>
              <span class="text-[#888888] text-[11px]">Done</span>
            </div>
            <div class="flex flex-col items-center rounded-lg bg-[#111111] py-2">
              <span class="text-[#febc2e] text-sm font-bold">{{ ws.taskCount - ws.doneCount }}</span>
              <span class="text-[#888888] text-[11px]">Remaining</span>
            </div>
          </div>

          @if (ws.taskCount > 0) {
            <div class="flex flex-col gap-1">
              <div class="flex items-center justify-between">
                <span class="text-[#888888] text-xs">Progress</span>
                <span class="text-[#888888] text-xs">{{ progress(ws) }}%</span>
              </div>
              <div class="w-full h-1.5 rounded-full bg-[#2a2a2a]">
                <div class="h-full rounded-full bg-[#E8593C] transition-all duration-500"
                     [style.width.%]="progress(ws)"></div>
              </div>
            </div>
          }

          <button
            class="flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium text-white bg-[#E8593C] border-none cursor-pointer hover:bg-[#d04a2e] transition-all"
            [routerLink]="['/workspace', ws.id]"
          >
            <span class="material-icons-outlined" style="font-size: 16px;">rocket_launch</span>
            Open Workspace
          </button>
        </div>
      }

      @if (!svc.loading() && svc.summaries().length === 0) {
        <div class="flex flex-col items-center gap-3 py-16 text-center">
          <span class="material-icons text-[#2a2a2a]" style="font-size: 48px;">rocket_launch</span>
          <p class="text-[#888888] text-sm m-0">You have no workspaces yet</p>
          <p class="text-[#888888] text-xs m-0">
            Join a hackathon team to get one automatically, or create a group above.
          </p>
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
export class MyWorkspaces implements OnInit {
  showCreate = signal(false);
  newName    = signal('');

  constructor(readonly svc: WorkspaceService) {}

  ngOnInit() { this.svc.loadAll(); }

  progress(ws: { taskCount: number; doneCount: number }): number {
    return ws.taskCount === 0 ? 0 : Math.round((ws.doneCount / ws.taskCount) * 100);
  }

  createWorkspace() {
    const name = this.newName().trim();
    if (!name) return;
    this.svc.createWorkspace(name);
    this.newName.set('');
    this.showCreate.set(false);
  }
}
