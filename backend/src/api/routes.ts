import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import {
  readSession,
  setSessionCookie,
  clearSessionCookie,
  DUMMY_HASH,
} from '../auth/session.ts';
import { db } from '../db/storage.ts';
import { jobQueue } from '../jobs/queue.ts';
import {
  broadcastTaskEvent,
  broadcastCommentEvent,
  broadcastNotification,
  broadcastActivityEvent,
} from '../realtime/socket.ts';
import { hasPermission, canManageRole } from '../shared/permissions.ts';
import { wouldCreateDependencyCycle } from '../shared/dependencies.ts';

export function logAndBroadcastActivity(logData: Parameters<typeof db.logActivity>[0]) {
  const log = db.logActivity(logData);
  broadcastActivityEvent(log.organizationId, log);
  return log;
}
import {
  registerSchema,
  loginSchema,
  createOrgSchema,
  updateOrgSchema,
  inviteMemberSchema,
  updateMemberRoleSchema,
  createProjectSchema,
  updateProjectSchema,
  createTaskSchema,
  updateTaskSchema,
  createCommentSchema,
  createReleaseSchema,
  updateReleaseSchema,
} from '../shared/validation.ts';
import type { Role, User, Organization } from '../shared/types.ts';

export const apiRouter = Router();

export interface AuthenticatedRequest extends Request {
  user: User;
  organization: Organization;
  membershipRole: Role;
}

// Authentication & Tenant Context Middleware (JWT in httpOnly cookie)
//
// Every request is tied to ONE workspace. When the URL points at a specific workspace,
// project, task, comment or release, that workspace is the one used, and the caller
// must be a member of it. This is what keeps one customer's data away from another's.
function requireAuth(req: Request, res: Response, next: NextFunction) {
  const session = readSession(req);
  if (!session) {
    return res.status(401).json({ error: 'Please log in to continue' });
  }

  const user = db.getUserById(session.userId);
  if (!user || user.status !== 'active') {
    clearSessionCookie(res);
    return res.status(401).json({ error: 'Please log in to continue' });
  }

  // Work out which workspace this request is about
  const p = req.params as Record<string, string | undefined>;
  let targetOrgId: string | undefined;
  let notFound = false;

  if (p.orgId) {
    targetOrgId = p.orgId;
    if (!db.getOrganizationById(p.orgId)) notFound = true;
  } else if (p.projectId) {
    const project = db.getProjectById(p.projectId);
    project ? (targetOrgId = project.organizationId) : (notFound = true);
  } else if (p.taskId) {
    const task = db.getTaskById(p.taskId);
    task ? (targetOrgId = task.organizationId) : (notFound = true);
  } else if (p.commentId) {
    const comment = db.getCommentById(p.commentId);
    comment ? (targetOrgId = comment.organizationId) : (notFound = true);
  } else if (p.releaseId) {
    const release = db.getReleaseById(p.releaseId);
    release ? (targetOrgId = release.organizationId) : (notFound = true);
  }

  const userOrgs = db.getOrganizationsForUser(user.id);
  let org: Organization | undefined;

  if (targetOrgId && !notFound) {
    org = userOrgs.find((o) => o.id === targetOrgId);
    // Same answer for "does not exist" and "not yours", so ids cannot be probed
    if (!org) notFound = true;
  } else if (!notFound) {
    org = userOrgs.find((o) => o.id === session.orgId) || userOrgs[0];
    if (!org) {
      return res.status(403).json({ error: 'No active organization found' });
    }
  }

  if (notFound || !org) {
    return res.status(404).json({ error: 'Not found, or you do not have access to it' });
  }

  const membership = db.getMembership(org.id, user.id);
  const role: Role = membership?.role || 'guest';

  (req as any).user = user;
  (req as any).organization = org;
  (req as any).membershipRole = role;
  next();
}

// Permission Gate Middleware
function requireRolePermission(permission: any) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role: Role = (req as any).membershipRole;
    if (!hasPermission(role, permission)) {
      return res.status(403).json({
        error: `Forbidden: Role '${role}' lacks permission '${permission}'`,
      });
    }
    next();
  };
}

// --- AUTH ---

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again in a few minutes.' },
});

function slugify(input: string) {
  const base = input.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24) || 'workspace';
  let slug = base;
  while (db.getOrganizations().some((o) => o.slug === slug)) {
    slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }
  return slug;
}

function authPayload(userId: string, orgId?: string) {
  const user = db.getUserById(userId)!;
  const userOrgs = db.getOrganizationsForUser(user.id);
  const org = userOrgs.find((o) => o.id === orgId) || userOrgs[0] || null;
  const membership = org ? db.getMembership(org.id, user.id) : undefined;
  return {
    user,
    organization: org,
    membershipRole: (membership?.role || 'guest') as Role,
    availableOrganizations: userOrgs,
  };
}

apiRouter.get('/auth/me', requireAuth, (req: Request, res: Response) => {
  const authReq = req as any as AuthenticatedRequest;
  res.json(authPayload(authReq.user.id, authReq.organization.id));
});

apiRouter.post('/auth/login', authLimiter, async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const user = db.getUserByEmail(parsed.data.email);
  const hash = user ? db.getPasswordHash(user.id) : undefined;
  // Always run a bcrypt compare so response time does not reveal whether the email exists
  const ok = await bcrypt.compare(parsed.data.password, hash || DUMMY_HASH);
  if (!user || !hash || !ok || user.status !== 'active') {
    console.warn(`[Auth] Failed login for ${parsed.data.email}`);
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const payload = authPayload(user.id);
  setSessionCookie(res, user.id, payload.organization?.id);
  res.json(payload);
});

apiRouter.post('/auth/register', authLimiter, async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  if (db.getUserByEmail(parsed.data.email)) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  const hash = await bcrypt.hash(parsed.data.password, 12);
  const newUser = db.createUser({
    name: parsed.data.name.trim(),
    email: parsed.data.email.trim().toLowerCase(),
    title: parsed.data.title || '',
    avatarUrl: '',
    status: 'active',
  });
  db.setPasswordHash(newUser.id, hash);

  const workspaceName = (parsed.data.workspaceName || `${parsed.data.name.trim()}'s Workspace`).trim();
  const org = db.createOrganization({
    name: workspaceName,
    slug: slugify(workspaceName),
    description: '',
    ownerId: newUser.id,
  });

  setSessionCookie(res, newUser.id, org.id);
  res.status(201).json(authPayload(newUser.id, org.id));
});

apiRouter.post('/auth/logout', (_req: Request, res: Response) => {
  clearSessionCookie(res);
  res.json({ success: true });
});

apiRouter.post('/auth/switch-organization', requireAuth, (req: Request, res: Response) => {
  const authReq = req as any as AuthenticatedRequest;
  const orgId = String(req.body?.organizationId || '');
  if (!db.getMembership(orgId, authReq.user.id)) {
    return res.status(403).json({ error: 'You are not a member of that workspace' });
  }
  setSessionCookie(res, authReq.user.id, orgId);
  res.json(authPayload(authReq.user.id, orgId));
});

apiRouter.get('/users', requireAuth, (req: Request, res: Response) => {
  const authReq = req as any as AuthenticatedRequest;
  const members = db.getMemberships(authReq.organization.id);
  res.json(members.map((m) => m.user).filter(Boolean));
});

// --- ORGANIZATIONS ---

apiRouter.get('/organizations', requireAuth, (req: Request, res: Response) => {
  const authReq = req as any as AuthenticatedRequest;
  const orgs = db.getOrganizationsForUser(authReq.user.id);
  res.json(orgs);
});

apiRouter.post('/organizations', requireAuth, (req: Request, res: Response) => {
  const authReq = req as any as AuthenticatedRequest;
  const parsed = createOrgSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const existingSlug = db.getOrganizations().find((o) => o.slug === parsed.data.slug);
  if (existingSlug) {
    return res.status(400).json({ error: 'Workspace URL identifier (slug) already taken' });
  }

  const org = db.createOrganization({
    name: parsed.data.name,
    slug: parsed.data.slug,
    description: parsed.data.description || '',
    ownerId: authReq.user.id,
  });

  setSessionCookie(res, authReq.user.id, org.id);
  res.status(201).json(org);
});

apiRouter.get('/organizations/:orgId', requireAuth, (req: Request, res: Response) => {
  const org = db.getOrganizationById(req.params.orgId);
  if (!org) return res.status(404).json({ error: 'Organization not found' });
  res.json(org);
});

apiRouter.patch('/organizations/:orgId', requireAuth, requireRolePermission('org:update'), (req: Request, res: Response) => {
  const parsed = updateOrgSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const updated = db.updateOrganization(req.params.orgId, parsed.data);
  if (!updated) return res.status(404).json({ error: 'Organization not found' });
  res.json(updated);
});

apiRouter.delete('/organizations/:orgId', requireAuth, requireRolePermission('org:delete'), (req: Request, res: Response) => {
  const deleted = db.deleteOrganization(req.params.orgId);
  if (!deleted) return res.status(404).json({ error: 'Organization not found' });
  res.json({ success: true, message: 'Organization deleted' });
});

// --- WORKSPACE GLOBAL SEARCH ---

apiRouter.get('/organizations/:orgId/search', requireAuth, (req: Request, res: Response) => {
  const orgId = req.params.orgId;
  const q = (req.query.q as string || '').trim().toLowerCase();

  if (!q) {
    return res.json({ tasks: [], projects: [], members: [] });
  }

  // 1. Projects
  const orgProjects = db.getProjects(orgId);
  const matchedProjects = orgProjects.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.key.toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q)
  );

  // 2. Tasks
  const orgTasks = db.getAllOrgTasks(orgId);
  const matchedTasks = orgTasks
    .filter((t) => {
      const matchKey = t.key.toLowerCase().includes(q);
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchDesc = (t.description || '').toLowerCase().includes(q);
      const matchLabels = t.labels.some((l) => l.toLowerCase().includes(q));
      return matchKey || matchTitle || matchDesc || matchLabels;
    })
    .map((t) => {
      const proj = orgProjects.find((p) => p.id === t.projectId);
      const assignee = t.assigneeId ? db.getUserById(t.assigneeId) : undefined;
      return {
        ...t,
        projectName: proj?.name || '',
        projectKey: proj?.key || '',
        assignee,
      };
    })
    .slice(0, 10);

  // 3. Members
  const memberships = db.getMemberships(orgId);
  const matchedMembers = memberships
    .filter((m) => {
      const u = m.user;
      if (!u) return false;
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.title || '').toLowerCase().includes(q)
      );
    })
    .map((m) => ({
      membershipId: m.id,
      role: m.role,
      user: m.user,
    }));

  res.json({
    tasks: matchedTasks,
    projects: matchedProjects,
    members: matchedMembers,
  });
});

// --- MEMBERS & INVITATIONS ---

apiRouter.get('/organizations/:orgId/members', requireAuth, (req: Request, res: Response) => {
  const members = db.getMemberships(req.params.orgId);
  res.json(members);
});

apiRouter.patch('/organizations/:orgId/members/:userId', requireAuth, requireRolePermission('members:update_role'), (req: Request, res: Response) => {
  const authReq = req as any as AuthenticatedRequest;
  const { orgId, userId } = req.params;
  const parsed = updateMemberRoleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const targetMem = db.getMembership(orgId, userId);
  if (!targetMem) return res.status(404).json({ error: 'Member not found' });

  if (!canManageRole(authReq.membershipRole, targetMem.role, parsed.data.role)) {
    return res.status(403).json({ error: 'You do not have permission to modify this role' });
  }

  const updated = db.updateMembershipRole(orgId, userId, parsed.data.role);
  logAndBroadcastActivity({
    organizationId: orgId,
    actorId: authReq.user.id,
    actorName: authReq.user.name,
    action: 'member:role_updated',
    details: `Updated role of member ${userId} to ${parsed.data.role}`,
  });

  res.json(updated);
});

apiRouter.delete('/organizations/:orgId/members/:userId', requireAuth, requireRolePermission('members:remove'), (req: Request, res: Response) => {
  const authReq = req as any as AuthenticatedRequest;
  const { orgId, userId } = req.params;

  const targetMem = db.getMembership(orgId, userId);
  if (!targetMem) return res.status(404).json({ error: 'Member not found' });
  if (targetMem.role === 'owner') {
    return res.status(403).json({ error: 'Cannot remove organization owner' });
  }

  db.removeMembership(orgId, userId);
  logAndBroadcastActivity({
    organizationId: orgId,
    actorId: authReq.user.id,
    actorName: authReq.user.name,
    action: 'member:removed',
    details: `Removed user ${userId} from organization`,
  });

  res.json({ success: true });
});

apiRouter.get('/organizations/:orgId/invitations', requireAuth, (req: Request, res: Response) => {
  res.json(db.getInvitations(req.params.orgId));
});

apiRouter.post('/organizations/:orgId/invitations', requireAuth, requireRolePermission('members:invite'), async (req: Request, res: Response) => {
  const authReq = req as any as AuthenticatedRequest;
  const parsed = inviteMemberSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const token = `inv_${crypto.randomBytes(12).toString('hex')}`;
  const inv = db.createInvitation({
    organizationId: req.params.orgId,
    email: parsed.data.email,
    role: parsed.data.role,
    token,
    invitedById: authReq.user.id,
    expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
  });

  // Enqueue background email invitation job
  await jobQueue.add('email:invitation', {
    email: inv.email,
    token: inv.token,
    organizationName: authReq.organization.name,
    role: inv.role,
  });

  logAndBroadcastActivity({
    organizationId: req.params.orgId,
    actorId: authReq.user.id,
    actorName: authReq.user.name,
    action: 'member:invited',
    details: `Sent invitation to ${inv.email} with role ${inv.role}`,
  });

  res.status(201).json(inv);
});

apiRouter.post('/invitations/:token/accept', requireAuth, (req: Request, res: Response) => {
  const authReq = req as any as AuthenticatedRequest;
  const success = db.acceptInvitation(req.params.token, authReq.user.id);
  if (!success) {
    return res.status(400).json({ error: 'Invalid or expired invitation token' });
  }
  res.json({ success: true, message: 'Invitation accepted' });
});

// --- PROJECTS ---

apiRouter.get('/organizations/:orgId/projects', requireAuth, (req: Request, res: Response) => {
  const projects = db.getProjects(req.params.orgId);
  res.json(projects);
});

apiRouter.post('/organizations/:orgId/projects', requireAuth, requireRolePermission('projects:create'), (req: Request, res: Response) => {
  const authReq = req as any as AuthenticatedRequest;
  const parsed = createProjectSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  if (!db.getMembership(req.params.orgId, parsed.data.leadId)) {
    return res.status(400).json({ error: 'Project lead must be a member of this workspace' });
  }

  const existingKey = db.getProjects(req.params.orgId).find((p) => p.key === parsed.data.key);
  if (existingKey) {
    return res.status(400).json({ error: `Project key '${parsed.data.key}' is already in use in this workspace` });
  }

  const newProject = db.createProject({
    organizationId: req.params.orgId,
    name: parsed.data.name,
    key: parsed.data.key,
    description: parsed.data.description || '',
    leadId: parsed.data.leadId,
    status: 'active',
    startDate: parsed.data.startDate || new Date().toISOString(),
    targetDate: parsed.data.targetDate,
  });

  logAndBroadcastActivity({
    organizationId: req.params.orgId,
    projectId: newProject.id,
    actorId: authReq.user.id,
    actorName: authReq.user.name,
    action: 'project:created',
    details: `Created project ${newProject.name} [${newProject.key}]`,
  });

  res.status(201).json(newProject);
});

apiRouter.get('/projects/:projectId', requireAuth, (req: Request, res: Response) => {
  const project = db.getProjectById(req.params.projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  res.json(project);
});

apiRouter.patch('/projects/:projectId', requireAuth, requireRolePermission('projects:update'), (req: Request, res: Response) => {
  const authReq = req as any as AuthenticatedRequest;
  const parsed = updateProjectSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const updated = db.updateProject(req.params.projectId, parsed.data);
  if (!updated) return res.status(404).json({ error: 'Project not found' });

  logAndBroadcastActivity({
    organizationId: updated.organizationId,
    projectId: updated.id,
    actorId: authReq.user.id,
    actorName: authReq.user.name,
    action: 'project:updated',
    details: `Updated project ${updated.name}`,
  });

  res.json(updated);
});

apiRouter.delete('/projects/:projectId', requireAuth, requireRolePermission('projects:delete'), (req: Request, res: Response) => {
  const authReq = req as any as AuthenticatedRequest;
  const project = db.getProjectById(req.params.projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  db.deleteProject(project.id);
  logAndBroadcastActivity({
    organizationId: project.organizationId,
    actorId: authReq.user.id,
    actorName: authReq.user.name,
    action: 'project:deleted',
    details: `Deleted project ${project.name} and related tasks`,
  });

  res.json({ success: true });
});

// --- TASKS ---

apiRouter.get('/projects/:projectId/tasks', requireAuth, (req: Request, res: Response) => {
  const tasks = db.getTasks(req.params.projectId);
  res.json(tasks);
});

apiRouter.post('/projects/:projectId/tasks', requireAuth, requireRolePermission('tasks:create'), async (req: Request, res: Response) => {
  const authReq = req as any as AuthenticatedRequest;
  const parsed = createTaskSchema.safeParse({ ...req.body, projectId: req.params.projectId });
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  if (parsed.data.assigneeId && !db.getMembership(authReq.organization.id, parsed.data.assigneeId)) {
    return res.status(400).json({ error: 'Assignee must be a member of this workspace' });
  }

  // Check dependencies for cycles
  const projectTasks = db.getTasks(req.params.projectId);
  for (const depId of parsed.data.dependencies) {
    if (wouldCreateDependencyCycle(projectTasks, 'new_task', depId)) {
      return res.status(400).json({ error: 'Invalid dependency: would create a circular dependency cycle' });
    }
  }

  const task = db.createTask({
    organizationId: authReq.organization.id,
    projectId: req.params.projectId,
    title: parsed.data.title,
    description: parsed.data.description,
    status: parsed.data.status,
    priority: parsed.data.priority,
    assigneeId: parsed.data.assigneeId,
    reporterId: authReq.user.id,
    labels: parsed.data.labels,
    dueDate: parsed.data.dueDate,
    estimatedEffort: parsed.data.estimatedEffort,
    dependencies: parsed.data.dependencies,
    releaseId: parsed.data.releaseId,
  });

  // Notify assignee if assigned to someone else
  if (task.assigneeId && task.assigneeId !== authReq.user.id) {
    const notif = db.createNotification({
      organizationId: authReq.organization.id,
      userId: task.assigneeId,
      type: 'task_assigned',
      title: 'Task Assigned',
      message: `${authReq.user.name} assigned you to ${task.key}: ${task.title}`,
      linkUrl: `/projects/${task.projectId}?task=${task.id}`,
    });
    broadcastNotification(task.assigneeId, notif);
  }

  logAndBroadcastActivity({
    organizationId: authReq.organization.id,
    projectId: task.projectId,
    taskId: task.id,
    actorId: authReq.user.id,
    actorName: authReq.user.name,
    action: 'task:created',
    details: `Created task ${task.key}: ${task.title}`,
  });

  // Real-time broadcast
  broadcastTaskEvent(authReq.organization.id, task.projectId, 'task:created', task);

  res.status(201).json(task);
});

apiRouter.get('/tasks/:taskId', requireAuth, (req: Request, res: Response) => {
  const task = db.getTaskById(req.params.taskId);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
});

apiRouter.patch('/tasks/:taskId', requireAuth, requireRolePermission('tasks:update'), (req: Request, res: Response) => {
  const authReq = req as any as AuthenticatedRequest;
  const parsed = updateTaskSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const existingTask = db.getTaskById(req.params.taskId);
  if (!existingTask) return res.status(404).json({ error: 'Task not found' });

  // Validate dependencies if updating
  if (parsed.data.dependencies) {
    const projectTasks = db.getTasks(existingTask.projectId);
    for (const depId of parsed.data.dependencies) {
      if (wouldCreateDependencyCycle(projectTasks, existingTask.id, depId)) {
        return res.status(400).json({
          error: `Circular dependency detected: adding task ${depId} creates a directed cycle!`,
        });
      }
    }
  }

  const authOrgId = (req as any).organization.id as string;
  if (parsed.data.assigneeId && !db.getMembership(authOrgId, parsed.data.assigneeId)) {
    return res.status(400).json({ error: 'Assignee must be a member of this workspace' });
  }

  // Optimistic Concurrency Control
  const result = db.updateTask(req.params.taskId, parsed.data, parsed.data.version);
  if (result.conflict) {
    return res.status(409).json({
      error: 'Conflict: Task was modified by another team member. Reloading authoritative version.',
      serverTask: result.task,
      serverVersion: result.currentVersion,
    });
  }

  const updatedTask = result.task!;

  // Activity audit log
  let changeDesc = `Updated task ${updatedTask.key}`;
  if (parsed.data.status && parsed.data.status !== existingTask.status) {
    changeDesc = `Changed status of ${updatedTask.key} from ${existingTask.status} to ${parsed.data.status}`;
  } else if (parsed.data.assigneeId !== undefined && parsed.data.assigneeId !== existingTask.assigneeId) {
    changeDesc = `Reassigned ${updatedTask.key}`;
  }

  logAndBroadcastActivity({
    organizationId: authReq.organization.id,
    projectId: updatedTask.projectId,
    taskId: updatedTask.id,
    actorId: authReq.user.id,
    actorName: authReq.user.name,
    action: 'task:updated',
    details: changeDesc,
  });

  // Real-time broadcast
  broadcastTaskEvent(authReq.organization.id, updatedTask.projectId, 'task:updated', updatedTask);

  res.json(updatedTask);
});

apiRouter.delete('/tasks/:taskId', requireAuth, requireRolePermission('tasks:delete'), (req: Request, res: Response) => {
  const authReq = req as any as AuthenticatedRequest;
  const task = db.getTaskById(req.params.taskId);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  db.deleteTask(task.id);
  logAndBroadcastActivity({
    organizationId: authReq.organization.id,
    projectId: task.projectId,
    actorId: authReq.user.id,
    actorName: authReq.user.name,
    action: 'task:deleted',
    details: `Deleted task ${task.key}`,
  });

  broadcastTaskEvent(authReq.organization.id, task.projectId, 'task:deleted', { taskId: task.id });

  res.json({ success: true });
});

// --- COMMENTS ---

apiRouter.get('/tasks/:taskId/comments', requireAuth, (req: Request, res: Response) => {
  const comments = db.getComments(req.params.taskId);
  res.json(comments);
});

apiRouter.post('/tasks/:taskId/comments', requireAuth, requireRolePermission('comments:create'), (req: Request, res: Response) => {
  const authReq = req as any as AuthenticatedRequest;
  const parsed = createCommentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const task = db.getTaskById(req.params.taskId);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const comment = db.createComment({
    organizationId: authReq.organization.id,
    projectId: task.projectId,
    taskId: task.id,
    authorId: authReq.user.id,
    content: parsed.data.content,
  });

  // Notify task assignee if someone else commented
  if (task.assigneeId && task.assigneeId !== authReq.user.id) {
    const notif = db.createNotification({
      organizationId: authReq.organization.id,
      userId: task.assigneeId,
      type: 'comment_added',
      title: 'New Comment',
      message: `${authReq.user.name} commented on ${task.key}: "${parsed.data.content.slice(0, 60)}..."`,
      linkUrl: `/projects/${task.projectId}?task=${task.id}`,
    });
    broadcastNotification(task.assigneeId, notif);
  }

  logAndBroadcastActivity({
    organizationId: authReq.organization.id,
    projectId: task.projectId,
    taskId: task.id,
    actorId: authReq.user.id,
    actorName: authReq.user.name,
    action: 'comment:created',
    details: `Commented on ${task.key}: "${parsed.data.content.slice(0, 50)}..."`,
  });

  broadcastCommentEvent(task.projectId, 'comment:created', comment);

  res.status(201).json(comment);
});

apiRouter.delete('/comments/:commentId', requireAuth, requireRolePermission('comments:delete'), (req: Request, res: Response) => {
  const success = db.deleteComment(req.params.commentId);
  if (!success) return res.status(404).json({ error: 'Comment not found' });
  res.json({ success: true });
});

// --- RELEASES ---

apiRouter.get('/organizations/:orgId/releases', requireAuth, (req: Request, res: Response) => {
  const projectId = req.query.projectId as string | undefined;
  const releases = db.getReleases(req.params.orgId, projectId);
  res.json(releases);
});

apiRouter.post('/organizations/:orgId/releases', requireAuth, requireRolePermission('releases:create'), (req: Request, res: Response) => {
  const authReq = req as any as AuthenticatedRequest;
  const parsed = createReleaseSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const projectId = req.body.projectId;
  if (!projectId) return res.status(400).json({ error: 'Project ID is required' });

  const release = db.createRelease({
    organizationId: req.params.orgId,
    projectId,
    version: parsed.data.version,
    title: parsed.data.title,
    description: parsed.data.description,
    status: parsed.data.status,
    targetDate: parsed.data.targetDate,
    linkedTaskIds: parsed.data.linkedTaskIds,
    releaseNotes: parsed.data.releaseNotes || `### Release ${parsed.data.version}\n- Initial release candidate`,
  });

  logAndBroadcastActivity({
    organizationId: req.params.orgId,
    projectId,
    actorId: authReq.user.id,
    actorName: authReq.user.name,
    action: 'release:created',
    details: `Created release ${release.version}: ${release.title}`,
  });

  res.status(201).json(release);
});

apiRouter.patch('/releases/:releaseId', requireAuth, requireRolePermission('releases:update'), (req: Request, res: Response) => {
  const authReq = req as any as AuthenticatedRequest;
  const parsed = updateReleaseSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const updates: any = { ...parsed.data };
  if (parsed.data.status === 'released') {
    updates.releasedAt = new Date().toISOString();
  }

  const updated = db.updateRelease(req.params.releaseId, updates);
  if (!updated) return res.status(404).json({ error: 'Release not found' });

  logAndBroadcastActivity({
    organizationId: updated.organizationId,
    projectId: updated.projectId,
    actorId: authReq.user.id,
    actorName: authReq.user.name,
    action: 'release:updated',
    details: `Updated release ${updated.version} (status: ${updated.status})`,
  });

  res.json(updated);
});

// --- NOTIFICATIONS ---

apiRouter.get('/notifications', requireAuth, (req: Request, res: Response) => {
  const authReq = req as any as AuthenticatedRequest;
  const list = db.getNotifications(authReq.user.id);
  res.json(list);
});

apiRouter.patch('/notifications/:id/read', requireAuth, (req: Request, res: Response) => {
  db.markNotificationAsRead(req.params.id);
  res.json({ success: true });
});

apiRouter.post('/notifications/read-all', requireAuth, (req: Request, res: Response) => {
  const authReq = req as any as AuthenticatedRequest;
  db.markAllNotificationsAsRead(authReq.user.id);
  res.json({ success: true });
});

// --- ACTIVITY LOGS ---

apiRouter.get('/organizations/:orgId/activity', requireAuth, (req: Request, res: Response) => {
  const projectId = req.query.projectId as string | undefined;
  const taskId = req.query.taskId as string | undefined;
  const logs = db.getActivityLogs(req.params.orgId, projectId, taskId);
  res.json(logs);
});

// --- ANALYTICS ---

apiRouter.get('/organizations/:orgId/analytics', requireAuth, (req: Request, res: Response) => {
  const orgId = req.params.orgId;
  const projects = db.getProjects(orgId);
  const tasks = db.getAllOrgTasks(orgId);
  const users = db.getUsers();

  const now = new Date();
  let overdueTasks = 0;
  const statusBreakdown: Record<string, number> = {
    backlog: 0,
    todo: 0,
    in_progress: 0,
    in_review: 0,
    done: 0,
    cancelled: 0,
  };

  const priorityBreakdown: Record<string, number> = {
    low: 0,
    medium: 0,
    high: 0,
    urgent: 0,
  };

  const userWorkloadMap = new Map<string, { total: number; done: number }>();
  for (const u of users) {
    userWorkloadMap.set(u.id, { total: 0, done: 0 });
  }

  for (const t of tasks) {
    statusBreakdown[t.status] = (statusBreakdown[t.status] || 0) + 1;
    priorityBreakdown[t.priority] = (priorityBreakdown[t.priority] || 0) + 1;

    if (t.dueDate && new Date(t.dueDate) < now && t.status !== 'done' && t.status !== 'cancelled') {
      overdueTasks++;
    }

    if (t.assigneeId && userWorkloadMap.has(t.assigneeId)) {
      const w = userWorkloadMap.get(t.assigneeId)!;
      w.total++;
      if (t.status === 'done') w.done++;
    }
  }

  const assigneeWorkload = users
    .map((u) => {
      const stats = userWorkloadMap.get(u.id) || { total: 0, done: 0 };
      return {
        userId: u.id,
        userName: u.name,
        userAvatar: u.avatarUrl,
        taskCount: stats.total,
        completedCount: stats.done,
      };
    })
    .filter((w) => w.taskCount > 0);

  const completedTasks = statusBreakdown.done || 0;
  const openTasks = tasks.length - completedTasks - (statusBreakdown.cancelled || 0);

  res.json({
    totalProjects: projects.length,
    openTasks,
    completedTasks,
    overdueTasks,
    statusBreakdown,
    priorityBreakdown,
    assigneeWorkload,
    velocityTrend: [
      { week: 'W-3', completedPoints: 18, createdCount: 12 },
      { week: 'W-2', completedPoints: 24, createdCount: 15 },
      { week: 'W-1', completedPoints: 31, createdCount: 14 },
      { week: 'Current', completedPoints: 14, createdCount: 6 },
    ],
  });
});

// --- GITHUB INTEGRATION & WEBHOOKS ---

apiRouter.post('/integrations/github/webhook', async (req: Request, res: Response) => {
  const signature = req.headers['x-hub-signature-256'] as string;
  const secret = process.env.GITHUB_WEBHOOK_SECRET || 'forgeflow_default_github_secret';

  // HMAC SHA-256 verification
  if (signature) {
    const rawBody = JSON.stringify(req.body);
    const expectedSignature = `sha256=${crypto.createHmac('sha256', secret).update(rawBody).digest('hex')}`;
    if (signature !== expectedSignature) {
      return res.status(401).json({ error: 'GitHub Webhook signature verification failed' });
    }
  }

  await processGitHubEvent(req.body);
  res.json({ received: true });
});

apiRouter.post('/integrations/github/simulate', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as any as AuthenticatedRequest;
  const { eventType, taskKey, prNumber, title } = req.body;
  const result = await simulateGitHubActivity(authReq.organization.id, authReq.user, eventType, taskKey, prNumber, title);
  res.json(result);
});

async function simulateGitHubActivity(
  orgId: string,
  actor: User,
  eventType: 'pr_opened' | 'pr_merged' | 'commit',
  taskKey?: string,
  prNumber = 204,
  prTitle = 'feat(core): update Kafka stream consumers'
) {
  const tasks = db.getAllOrgTasks(orgId);
  const targetTask = taskKey ? tasks.find((t) => t.key === taskKey) : tasks[0];

  if (!targetTask) {
    return { success: false, message: 'No target task found to link' };
  }

  if (eventType === 'pr_opened') {
    db.updateTask(targetTask.id, {
      status: 'in_review',
      githubPrNumber: prNumber,
      githubPrUrl: `https://github.com/acme/forgeflow/pull/${prNumber}`,
      githubPrState: 'open',
    });

    logAndBroadcastActivity({
      organizationId: targetTask.organizationId,
      projectId: targetTask.projectId,
      taskId: targetTask.id,
      actorId: actor.id,
      actorName: 'GitHub Bot',
      action: 'github:pr_opened',
      details: `Opened PR #${prNumber} "${prTitle}" referencing ${targetTask.key}`,
    });

    broadcastTaskEvent(targetTask.organizationId, targetTask.projectId, 'task:updated', db.getTaskById(targetTask.id));
    return { success: true, message: `Linked PR #${prNumber} to ${targetTask.key} and transitioned to In Review` };
  }

  if (eventType === 'pr_merged') {
    db.updateTask(targetTask.id, {
      status: 'done',
      githubPrState: 'merged',
    });

    logAndBroadcastActivity({
      organizationId: targetTask.organizationId,
      projectId: targetTask.projectId,
      taskId: targetTask.id,
      actorId: actor.id,
      actorName: 'GitHub Bot',
      action: 'github:pr_merged',
      details: `Merged PR #${prNumber} into main, marked ${targetTask.key} as Done`,
    });

    broadcastTaskEvent(targetTask.organizationId, targetTask.projectId, 'task:updated', db.getTaskById(targetTask.id));
    return { success: true, message: `Merged PR #${prNumber} and marked ${targetTask.key} as Done` };
  }

  return { success: true, message: 'Event simulated' };
}

async function processGitHubEvent(payload: any) {
  console.log('[GitHub Webhook] Received payload action:', payload?.action);
}
