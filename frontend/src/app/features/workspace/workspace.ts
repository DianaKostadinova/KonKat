import { Component, signal, computed, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { WorkspaceService } from './workspace.service';
import { Workspace as WorkspaceModel, Task, TaskStatus } from './workspace.model';

type ActiveTab = 'overview' | 'kanban' | 'chat' | 'files';

@Component({
  selector: 'app-workspace',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './workspace.html',
  styleUrl: './workspace.css',
})
export class Workspace implements OnInit, AfterViewChecked {
  @ViewChild('chatContainer') chatContainer!: ElementRef;

  activeTab = signal<ActiveTab>('overview');
  workspace = signal<WorkspaceModel | null>(null);
  newMessage = signal('');
  newTaskTitle = signal('');
  newTaskPriority = signal<'low' | 'medium' | 'high'>('medium');
  showAddTask = signal(false);
  shouldScroll = false;
  draggingTask = signal<Task | null>(null);

  tabs: { value: ActiveTab; label: string; icon: string }[] = [
    { value: 'overview', label: 'Overview',  icon: 'dashboard' },
    { value: 'kanban',   label: 'Kanban',    icon: 'view_kanban' },
    { value: 'chat',     label: 'Team Chat', icon: 'chat_bubble_outline' },
    { value: 'files',    label: 'Files',     icon: 'folder_open' },
  ];

  columns: { status: TaskStatus; label: string; color: string }[] = [
    { status: 'todo',       label: 'To Do',      color: '#888888' },
    { status: 'inprogress', label: 'In Progress', color: '#febc2e' },
    { status: 'done',       label: 'Done',        color: '#28c840' },
  ];

  constructor(
    private route: ActivatedRoute,
    private workspaceService: WorkspaceService,
  ) {}

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.workspace.set(this.workspaceService.getById(id) ?? null);
  }

  ngAfterViewChecked() {
    if (this.shouldScroll && this.chatContainer) {
      const el = this.chatContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
      this.shouldScroll = false;
    }
  }

  tasksByStatus(status: TaskStatus): Task[] {
    return this.workspace()?.tasks.filter(t => t.status === status) ?? [];
  }

  moveTask(task: Task, status: TaskStatus) {
    if (!this.workspace()) return;
    this.workspaceService.moveTask(this.workspace()!.id, task.id, status);
    this.workspace.set(this.workspaceService.getById(this.workspace()!.id) ?? null);
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
    if (!content || !this.workspace()) return;
    this.workspaceService.sendMessage(this.workspace()!.id, content);
    this.workspace.set(this.workspaceService.getById(this.workspace()!.id) ?? null);
    this.newMessage.set('');
    this.shouldScroll = true;
  }

  addTask() {
    if (!this.newTaskTitle().trim() || !this.workspace()) return;
    this.workspaceService.addTask(this.workspace()!.id, this.newTaskTitle(), this.newTaskPriority());
    this.workspace.set(this.workspaceService.getById(this.workspace()!.id) ?? null);
    this.newTaskTitle.set('');
    this.showAddTask.set(false);
  }

  onTaskTitleInput(e: Event) {
    this.newTaskTitle.set((e.target as HTMLInputElement).value);
  }

  priorityColor(priority: string): string {
    return priority === 'high' ? '#E8593C' : priority === 'medium' ? '#febc2e' : '#888888';
  }

  fileIcon(type: string): string {
    switch (type) {
      case 'figma': return 'brush';
      case 'doc':   return 'description';
      case 'image': return 'image';
      case 'code':  return 'code';
      default:      return 'insert_drive_file';
    }
  }

  isMe(senderId: number): boolean { return senderId === 0; }

  doneCount = computed(() => this.workspace()?.tasks.filter(t => t.status === 'done').length ?? 0);
  totalCount = computed(() => this.workspace()?.tasks.length ?? 0);
  onlineCount = computed(() => this.workspace()?.members.filter(m => m.online).length ?? 0);
}
