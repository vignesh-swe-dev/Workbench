/**
 * ForgeFlow Frontend API Client
 */

import type {
  User,
  Organization,
  Membership,
  Project,
  Task,
  Comment,
  Invitation,
  Notification,
  ActivityLog,
  Release,
  AnalyticsSummary,
  Role,
} from '../shared/types.ts';

const API_ORIGIN = import.meta.env.VITE_API_URL || '';
const BASE_URL = `${API_ORIGIN}/api/v1`;

type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler | null = null;

/** AppContext registers this so any 401 sends the user back to the login page. */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  onUnauthorized = handler;
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${url}`, {
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  });

  if (!res.ok) {
    let errorMsg = `Something went wrong (${res.status})`;
    try {
      const data = await res.json();
      if (typeof data.error === 'string') errorMsg = data.error;
    } catch {
      // ignore
    }
    const isAuthCall = url.startsWith('/auth/login') || url.startsWith('/auth/register') || url === '/auth/me';
    if (res.status === 401 && !isAuthCall) onUnauthorized?.();
    throw new Error(errorMsg);
  }

  return res.json();
}

export interface AuthResponse {
  user: User;
  organization: Organization | null;
  membershipRole: Role;
  availableOrganizations: Organization[];
}

export const api = {
  // Auth
  getMe: () => fetchJson<AuthResponse>('/auth/me'),

  login: (data: { email: string; password: string }) =>
    fetchJson<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),

  register: (data: { name: string; email: string; password: string; workspaceName: string }) =>
    fetchJson<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  logout: () => fetchJson<{ success: boolean }>('/auth/logout', { method: 'POST' }),

  switchOrganization: (organizationId: string) =>
    fetchJson<AuthResponse>('/auth/switch-organization', {
      method: 'POST',
      body: JSON.stringify({ organizationId }),
    }),

  getUsers: () => fetchJson<User[]>('/users'),

  // Organizations
  getOrganizations: () => fetchJson<Organization[]>('/organizations'),
  createOrganization: (data: { name: string; slug: string; description?: string }) =>
    fetchJson<Organization>('/organizations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Members & Invites
  getMembers: (orgId: string) => fetchJson<(Membership & { user?: User })[]>(`/organizations/${orgId}/members`),
  updateMemberRole: (orgId: string, userId: string, role: Role) =>
    fetchJson<Membership>(`/organizations/${orgId}/members/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),
  removeMember: (orgId: string, userId: string) =>
    fetchJson<{ success: boolean }>(`/organizations/${orgId}/members/${userId}`, {
      method: 'DELETE',
    }),
  getInvitations: (orgId: string) => fetchJson<Invitation[]>(`/organizations/${orgId}/invitations`),
  inviteMember: (orgId: string, email: string, role: Role) =>
    fetchJson<Invitation>(`/organizations/${orgId}/invitations`, {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    }),

  // Projects
  getProjects: (orgId: string) => fetchJson<(Project & { lead?: User })[]>(`/organizations/${orgId}/projects`),
  createProject: (orgId: string, data: { name: string; key: string; description?: string; leadId: string; targetDate?: string }) =>
    fetchJson<Project>(`/organizations/${orgId}/projects`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateProject: (projectId: string, data: Partial<Project>) =>
    fetchJson<Project>(`/projects/${projectId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteProject: (projectId: string) =>
    fetchJson<{ success: boolean }>(`/projects/${projectId}`, {
      method: 'DELETE',
    }),

  // Tasks
  getTasks: (projectId: string) => fetchJson<(Task & { assignee?: User; reporter?: User })[]>(`/projects/${projectId}/tasks`),
  createTask: (projectId: string, data: any) =>
    fetchJson<Task>(`/projects/${projectId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getTaskById: (taskId: string) => fetchJson<Task & { assignee?: User; reporter?: User }>(`/tasks/${taskId}`),
  updateTask: (taskId: string, data: Partial<Task>) =>
    fetchJson<Task>(`/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteTask: (taskId: string) =>
    fetchJson<{ success: boolean }>(`/tasks/${taskId}`, {
      method: 'DELETE',
    }),

  // Comments
  getComments: (taskId: string) => fetchJson<(Comment & { author?: User })[]>(`/tasks/${taskId}/comments`),
  createComment: (taskId: string, content: string) =>
    fetchJson<Comment>(`/tasks/${taskId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),
  deleteComment: (commentId: string) =>
    fetchJson<{ success: boolean }>(`/comments/${commentId}`, {
      method: 'DELETE',
    }),

  // Releases
  getReleases: (orgId: string, projectId?: string) =>
    fetchJson<Release[]>(`/organizations/${orgId}/releases${projectId ? `?projectId=${projectId}` : ''}`),
  createRelease: (orgId: string, data: any) =>
    fetchJson<Release>(`/organizations/${orgId}/releases`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateRelease: (releaseId: string, data: any) =>
    fetchJson<Release>(`/releases/${releaseId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // Notifications
  getNotifications: () => fetchJson<Notification[]>('/notifications'),
  markNotificationRead: (id: string) =>
    fetchJson<{ success: boolean }>(`/notifications/${id}/read`, {
      method: 'PATCH',
    }),
  markAllNotificationsRead: () =>
    fetchJson<{ success: boolean }>('/notifications/read-all', {
      method: 'POST',
    }),

  // Activity & Analytics
  getActivity: (orgId: string, projectId?: string, taskId?: string) => {
    let url = `/organizations/${orgId}/activity`;
    const params = new URLSearchParams();
    if (projectId) params.set('projectId', projectId);
    if (taskId) params.set('taskId', taskId);
    if (params.toString()) url += `?${params.toString()}`;
    return fetchJson<ActivityLog[]>(url);
  },
  getAnalytics: (orgId: string) => fetchJson<AnalyticsSummary>(`/organizations/${orgId}/analytics`),

  // GitHub Simulator
  simulateGitHub: (eventType: string, taskKey?: string, prNumber?: number, title?: string) =>
    fetchJson<{ success: boolean; message: string }>('/integrations/github/simulate', {
      method: 'POST',
      body: JSON.stringify({ eventType, taskKey, prNumber, title }),
    }),

  // Global Search
  searchWorkspace: (orgId: string, q: string) =>
    fetchJson<{
      tasks: (Task & { projectName: string; projectKey: string; assignee?: User })[];
      projects: Project[];
      members: { membershipId: string; role: Role; user?: User }[];
    }>(`/organizations/${orgId}/search?q=${encodeURIComponent(q)}`),
};
