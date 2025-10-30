import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(50),
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  title: z.string().optional().default(''),
  workspaceName: z.string().trim().min(2, 'Workspace name must be at least 2 characters').max(60).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  title: z.string().max(100).optional(),
  avatarUrl: z.string().url().optional(),
});

export const createOrgSchema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters').max(60),
  slug: z.string().min(2).max(40).regex(/^[a-z0-9-]+$/, 'Slug must only contain lowercase letters, numbers, and dashes'),
  description: z.string().max(300).optional().default(''),
});

export const updateOrgSchema = z.object({
  name: z.string().min(2).max(60).optional(),
  description: z.string().max(300).optional(),
});

export const inviteMemberSchema = z.object({
  email: z.string().email('Valid email required'),
  role: z.enum(['admin', 'member', 'guest']),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(['admin', 'member', 'guest']),
});

export const createProjectSchema = z.object({
  name: z.string().min(2, 'Project name must be at least 2 characters').max(60),
  key: z.string().min(2).max(10).regex(/^[A-Z0-9]+$/, 'Project key must be uppercase alphanumeric (e.g. ENG, CORE)'),
  description: z.string().max(500).optional().default(''),
  leadId: z.string().min(1, 'Project lead is required'),
  targetDate: z.string().optional(),
  startDate: z.string().optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(2).max(60).optional(),
  description: z.string().max(500).optional(),
  status: z.enum(['active', 'archived', 'completed']).optional(),
  leadId: z.string().optional(),
  targetDate: z.string().optional(),
  startDate: z.string().optional(),
});

export const createTaskSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  title: z.string().min(2, 'Title must be at least 2 characters').max(200),
  description: z.string().max(10000).optional().default(''),
  status: z.enum(['backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled']).default('todo'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  assigneeId: z.string().optional(),
  labels: z.array(z.string()).default([]),
  dueDate: z.string().optional(),
  estimatedEffort: z.number().min(0).max(100).optional(),
  dependencies: z.array(z.string()).default([]),
  releaseId: z.string().optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  description: z.string().max(10000).optional(),
  status: z.enum(['backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assigneeId: z.string().nullable().optional(),
  labels: z.array(z.string()).optional(),
  dueDate: z.string().nullable().optional(),
  estimatedEffort: z.number().min(0).max(100).nullable().optional(),
  dependencies: z.array(z.string()).optional(),
  position: z.number().optional(),
  version: z.number().optional(), // for optimistic concurrency validation
  releaseId: z.string().nullable().optional(),
});

export const createCommentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(2000),
});

export const createReleaseSchema = z.object({
  version: z.string().min(1, 'Version is required').regex(/^v?[0-9]+(\.[0-9]+)*(-[a-zA-Z0-9.]+)?$/, 'Format like v1.0.0 or 1.2.0'),
  title: z.string().min(2, 'Release title required').max(100),
  description: z.string().max(2000).optional().default(''),
  targetDate: z.string().min(1, 'Target date required'),
  linkedTaskIds: z.array(z.string()).default([]),
  status: z.enum(['planned', 'in_progress', 'released']).default('planned'),
  releaseNotes: z.string().optional(),
});

export const updateReleaseSchema = z.object({
  title: z.string().min(2).max(100).optional(),
  description: z.string().max(2000).optional(),
  targetDate: z.string().optional(),
  linkedTaskIds: z.array(z.string()).optional(),
  status: z.enum(['planned', 'in_progress', 'released']).optional(),
  releaseNotes: z.string().optional(),
});
