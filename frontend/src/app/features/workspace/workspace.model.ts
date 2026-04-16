export type TaskStatus = 'todo' | 'inprogress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: number;
  title: string;
  description?: string;
  assignee?: string;
  priority: TaskPriority;
  status: TaskStatus;
  createdAt: string;
}

export interface WorkspaceFile {
  id: number;
  name: string;
  type: 'figma' | 'doc' | 'image' | 'code' | 'other';
  size: string;
  uploadedBy: string;
  uploadedAt: string;
  url?: string;
}

export interface WorkspaceMessage {
  id: number;
  senderId: number;
  senderName: string;
  content: string;
  createdAt: string;
}

export interface Workspace {
  id: number;
  teamName: string;
  hackathon: string;
  hackathonDate: string;
  members: { id: number; name: string; role: string; online: boolean; }[];
  tasks: Task[];
  files: WorkspaceFile[];
  messages: WorkspaceMessage[];
  progress: number;
}
