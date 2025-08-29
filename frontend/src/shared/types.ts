/**
 * ForgeFlow Shared Domain Types & Contracts
 */

export type Role = 'owner' | 'admin' | 'member' | 'guest';

export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done' | 'cancelled';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  title: string;
  status: 'active' | 'suspended';
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string;
  logoUrl?: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Membership {
  id: string;
  organizationId: string;
  userId: string;
  role: Role;
  joinedAt: string;
  user?: User;
}

export interface Project {
  id: string;
  organizationId: string;
  name: string;
  key: string; // e.g. "FF", "CORE", "API"
  description: string;
  status: 'active' | 'archived' | 'completed';
  leadId: string;
  lead?: User;
  targetDate?: string;
  startDate?: string;
  taskSequence: number;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  organizationId: string;
  projectId: string;
  key: string; // e.g. "FF-101"
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: string;
  assignee?: User;
  reporterId: string;
  reporter?: User;
  labels: string[];
  dueDate?: string;
  estimatedEffort?: number; // story points or hours
  dependencies: string[]; // task IDs that this task depends on (must be done first)
  position: number;
  version: number; // optimistic concurrency version
  releaseId?: string;
  githubPrUrl?: string;
  githubPrNumber?: number;
  githubPrState?: 'open' | 'merged' | 'closed';
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  organizationId: string;
  projectId: string;
  taskId: string;
  authorId: string;
  author?: User;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface Invitation {
  id: string;
  organizationId: string;
  email: string;
  role: Role;
  token: string;
  invitedById: string;
  expiresAt: string;
  status: 'pending' | 'accepted' | 'revoked';
  createdAt: string;
}

export interface Notification {
  id: string;
  organizationId: string;
  userId: string;
  type: 'task_assigned' | 'task_updated' | 'comment_added' | 'member_invited' | 'release_published' | 'github_linked';
  title: string;
  message: string;
  read: boolean;
  linkUrl?: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  organizationId: string;
  projectId?: string;
  taskId?: string;
  actorId: string;
  actorName: string;
  action: string; // e.g. "task:status_changed", "task:created", "member:joined"
  details: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface Release {
  id: string;
  organizationId: string;
  projectId: string;
  version: string; // e.g. "v1.2.0"
  title: string;
  description: string;
  status: 'planned' | 'in_progress' | 'released';
  targetDate: string;
  releasedAt?: string;
  linkedTaskIds: string[];
  releaseNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GitHubWebhookPayload {
  action: 'opened' | 'closed' | 'reopened' | 'synchronize';
  pull_request?: {
    html_url: string;
    number: number;
    title: string;
    state: 'open' | 'closed';
    merged: boolean;
    body: string;
    head: { ref: string };
  };
  commits?: Array<{
    id: string;
    message: string;
    url: string;
    author: { name: string; email: string };
  }>;
  repository: {
    name: string;
    full_name: string;
  };
}

export interface AnalyticsSummary {
  totalProjects: number;
  openTasks: number;
  completedTasks: number;
  overdueTasks: number;
  statusBreakdown: Record<TaskStatus, number>;
  priorityBreakdown: Record<TaskPriority, number>;
  assigneeWorkload: Array<{
    userId: string;
    userName: string;
    userAvatar: string;
    taskCount: number;
    completedCount: number;
  }>;
  velocityTrend: Array<{
    week: string;
    completedPoints: number;
    createdCount: number;
  }>;
}

export interface PresenceUser {
  userId: string;
  userName: string;
  userAvatar: string;
  projectId?: string;
  taskId?: string;
  lastActive: string;
}
