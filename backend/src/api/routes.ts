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

export default router;
