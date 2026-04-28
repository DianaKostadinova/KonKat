export type TaskStatus = 'todo' | 'inprogress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface WorkspaceSummary {
  id: number;
  name: string;
  hackathonTitle: string | null;
  memberCount: number;
  taskCount: number;
  doneCount: number;
}

export interface WorkspaceMember {
  userId: number;
  name: string;
  role: string | null;
  avatarUrl: string | null;
}

export interface WorkspaceTask {
  id: number;
  title: string;
  description: string | null;
  assignee: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  createdAt: string;
}

export interface WorkspaceMessage {
  id: number;
  senderId: number;
  senderName: string;
  content: string;
  createdAt: string;
}

export interface WorkspaceDetail {
  id: number;
  name: string;
  hackathonTitle: string | null;
  hackathonId: number | null;
  members: WorkspaceMember[];
  tasks: WorkspaceTask[];
}
