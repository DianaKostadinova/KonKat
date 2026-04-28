import { Component, signal, computed, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { WorkspaceService } from './workspace.service';
import { TaskStatus } from './workspace.model';

type ActiveTab = 'overview' | 'kanban' | 'chat';

@Component({
  selector: 'app-workspace',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './workspace.html',
  styleUrl: './workspace.css',
})
export class Workspace implements OnInit, AfterViewChecked {
  @ViewChild('chatContainer') chatContainer!: ElementRef;

  activeTab       = signal<ActiveTab>('overview');
  newMessage      = signal('');
  newTaskTitle    = signal('');
  newTaskPriority = signal<'low' | 'medium' | 'high'>('medium');
  showAddTask     = signal(false);
  shouldScroll    = false;

  tabs: { value: ActiveTab; label: string; icon: string }[] = [
    { value: 'overview', label: 'Overview',  icon: 'dashboard' },
    { value: 'kanban',   label: 'Kanban',    icon: 'view_kanban' },
    { value: 'chat',     label: 'Team Chat', icon: 'chat_bubble_outline' },
  ];

  columns: { status: TaskStatus; label: string; color: string }[] = [
    { status: 'todo',       label: 'To Do',       color: '#888888' },
    { status: 'inprogress', label: 'In Progress',  color: '#febc2e' },
    { status: 'done',       label: 'Done',         color: '#28c840' },
  ];

  get workspace()  { return this.svc.current(); }
  get messages()   { return this.svc.messages(); }
  get meId()       { return this.svc.meId; }

  private workspaceId!: number;

  constructor(
    private route: ActivatedRoute,
    private svc: WorkspaceService,
  ) {}

  ngOnInit() {
    this.workspaceId = Number(this.route.snapshot.paramMap.get('id'));
    this.svc.loadOne(this.workspaceId);
    this.svc.loadMessages(this.workspaceId);
  }

  ngAfterViewChecked() {
    if (this.shouldScroll && this.chatContainer) {
      const el = this.chatContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
      this.shouldScroll = false;
    }
  }

  tasksByStatus(status: TaskStatus) {
    return this.workspace?.tasks.filter(t => t.status === status) ?? [];
  }

  moveTask(taskId: number, status: TaskStatus) {
    this.svc.moveTask(this.workspaceId, taskId, status);
  }

  addTask() {
    const title = this.newTaskTitle().trim();
    if (!title) return;
    this.svc.addTask(this.workspaceId, title, this.newTaskPriority());
    this.newTaskTitle.set('');
    this.showAddTask.set(false);
  }

  onMessageInput(e: Event) {
    this.newMessage.set((e.target as HTMLTextAreaElement).value);
  }

  onKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.sendMessage();
    }
  }

  sendMessage() {
    const content = this.newMessage().trim();
    if (!content) return;
    this.svc.sendMessage(this.workspaceId, content);
    this.newMessage.set('');
    this.shouldScroll = true;
  }

  onTaskTitleInput(e: Event) {
    this.newTaskTitle.set((e.target as HTMLInputElement).value);
  }

  formatTime(iso: string): string {
    try {
      return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    } catch { return iso; }
  }

  priorityColor(priority: string): string {
    return priority === 'high' ? '#E8593C' : priority === 'medium' ? '#febc2e' : '#888888';
  }

  isMe(senderId: number): boolean { return senderId === this.meId; }

  doneCount  = computed(() => this.workspace?.tasks.filter(t => t.status === 'done').length ?? 0);
  totalCount = computed(() => this.workspace?.tasks.length ?? 0);
  progress   = computed(() => {
    const total = this.totalCount();
    return total === 0 ? 0 : Math.round((this.doneCount() / total) * 100);
  });
}
