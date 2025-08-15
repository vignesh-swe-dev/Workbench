// Database dual storage engine
import path from 'node:path';
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
  Role,
} from '../shared/types.ts';
import { FilePersistence, MongoPersistence, type Persistence } from './persistence.ts';

const DATA_DIR = path.resolve(process.cwd(), "data");

export interface DatabaseSchema {
  users: User[];
  organizations: Organization[];
  memberships: Membership[];
  projects: Project[];
  tasks: Task[];
  comments: Comment[];
  invitations: Invitation[];
  notifications: Notification[];
  activityLogs: ActivityLog[];
  releases: Release[];
  /** userId -> bcrypt hash. Never returned by any API. */
  credentials: Record<string, string>;
}

function emptyDatabase(): DatabaseSchema {
  return {
    users: [],
    organizations: [],
    memberships: [],
    projects: [],
    tasks: [],
    comments: [],
    invitations: [],
    notifications: [],
    activityLogs: [],
    releases: [],
    credentials: {},
  };
}

class Storage {
  private data: DatabaseSchema;
  private initialized = false;
  private store!: Persistence;

  constructor() {
    this.data = emptyDatabase();
  }

  public async init() {
    if (this.initialized) return;

    const uri = process.env.MONGODB_URI?.trim();
    this.store = uri ? new MongoPersistence(uri) : new FilePersistence(DATA_DIR);

    try {
      const saved = await this.store.load();
      this.data = { ...emptyDatabase(), ...(saved ?? {}) };
    } catch (err: any) {
      // A configured MongoDB that cannot be reached must stop the server, never silently lose data.
      console.error(
        `\n[Storage] Could not open ${this.store.label}\n         ${err?.message || err}\n\n` +
          `         To run without MongoDB, delete or comment out MONGODB_URI in backend/.env.\n` +
          `         The app will then save its data in backend/data/workbench-db.json.\n`
      );
      throw err;
    }
    console.log(`[Storage] Using ${this.store.label}`);
    this.initialized = true;
  }

  /** Make sure everything is written before the process exits. */
  public async close() {
    await this.store?.flush();
  }

  private saveSync() {
    this.store.save(this.data);
  }

  // --- Users ---
  public getUsers(): User[] {
    return this.data.users;
  }

  public getUserById(id: string): User | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  public setPasswordHash(userId: string, hash: string) {
    this.data.credentials[userId] = hash;
    this.saveSync();
  }

  public getPasswordHash(userId: string): string | undefined {
    return this.data.credentials[userId];
  }

  public getUserByEmail(email: string): User | undefined {
    return this.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  public createUser(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): User {
    const newUser: User = {
      ...user,
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.users.push(newUser);
    this.saveSync();
    return newUser;
  }

  public updateUser(id: string, updates: Partial<User>): User | undefined {
    const user = this.getUserById(id);
    if (!user) return undefined;
    Object.assign(user, updates, { updatedAt: new Date().toISOString() });
    this.saveSync();
    return user;
  }

  // --- Organizations ---
  public getOrganizations(): Organization[] {
    return this.data.organizations;
  }

  public getOrganizationById(id: string): Organization | undefined {
    return this.data.organizations.find((o) => o.id === id);
  }

  public getOrganizationsForUser(userId: string): Organization[] {
    const userMemberships = this.data.memberships.filter((m) => m.userId === userId);
    const orgIds = new Set(userMemberships.map((m) => m.organizationId));
    return this.data.organizations.filter((o) => orgIds.has(o.id));
  }

  public createOrganization(org: Omit<Organization, 'id' | 'createdAt' | 'updatedAt'>): Organization {
    const newOrg: Organization = {
      ...org,
      id: `org_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.organizations.push(newOrg);
    // Automatically create owner membership
    this.createMembership({
      organizationId: newOrg.id,
      userId: org.ownerId,
      role: 'owner',
      joinedAt: new Date().toISOString(),
    });
    this.saveSync();
    return newOrg;
  }

  public updateOrganization(id: string, updates: Partial<Organization>): Organization | undefined {
    const org = this.getOrganizationById(id);
    if (!org) return undefined;
    Object.assign(org, updates, { updatedAt: new Date().toISOString() });
    this.saveSync();
    return org;
  }

  public deleteOrganization(id: string): boolean {
    const idx = this.data.organizations.findIndex((o) => o.id === id);
    if (idx === -1) return false;
    this.data.organizations.splice(idx, 1);
    // Cascade delete tenant-owned entities
    this.data.memberships = this.data.memberships.filter((m) => m.organizationId !== id);
    this.data.projects = this.data.projects.filter((p) => p.organizationId !== id);
    this.data.tasks = this.data.tasks.filter((t) => t.organizationId !== id);
    this.data.comments = this.data.comments.filter((c) => c.organizationId !== id);
    this.data.releases = this.data.releases.filter((r) => r.organizationId !== id);
    this.data.invitations = this.data.invitations.filter((i) => i.organizationId !== id);
    this.data.activityLogs = this.data.activityLogs.filter((a) => a.organizationId !== id);
    this.saveSync();
    return true;
  }

  // --- Memberships ---
  public getMemberships(organizationId: string): (Membership & { user?: User })[] {
    return this.data.memberships
      .filter((m) => m.organizationId === organizationId)
      .map((m) => ({
        ...m,
        user: this.getUserById(m.userId),
      }));
  }

  public getMembership(organizationId: string, userId: string): Membership | undefined {
    return this.data.memberships.find(
      (m) => m.organizationId === organizationId && m.userId === userId
    );
  }

  public createMembership(membership: Omit<Membership, 'id'>): Membership {
    const newMem: Membership = {
      ...membership,
      id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    };
    this.data.memberships.push(newMem);
    this.saveSync();
    return newMem;
  }

  public updateMembershipRole(organizationId: string, userId: string, newRole: Role): Membership | undefined {
    const mem = this.getMembership(organizationId, userId);
    if (!mem) return undefined;
    mem.role = newRole;
    this.saveSync();
    return mem;
  }

  public removeMembership(organizationId: string, userId: string): boolean {
    const idx = this.data.memberships.findIndex(
      (m) => m.organizationId === organizationId && m.userId === userId
    );
    if (idx === -1) return false;
    this.data.memberships.splice(idx, 1);
    this.saveSync();
    return true;
  }

  // --- Projects ---
  public getProjects(organizationId: string): (Project & { lead?: User })[] {
    return this.data.projects
      .filter((p) => p.organizationId === organizationId)
      .map((p) => ({
        ...p,
        lead: this.getUserById(p.leadId),
      }));
  }

  public getProjectById(projectId: string): (Project & { lead?: User }) | undefined {
    const proj = this.data.projects.find((p) => p.id === projectId);
    if (!proj) return undefined;
    return {
      ...proj,
      lead: this.getUserById(proj.leadId),
    };
  }

  public createProject(project: Omit<Project, 'id' | 'taskSequence' | 'createdAt' | 'updatedAt'>): Project {
    const newProj: Project = {
      ...project,
      id: `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      taskSequence: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.projects.push(newProj);
    this.saveSync();
    return newProj;
  }

  public updateProject(projectId: string, updates: Partial<Project>): Project | undefined {
    const proj = this.data.projects.find((p) => p.id === projectId);
    if (!proj) return undefined;
    Object.assign(proj, updates, { updatedAt: new Date().toISOString() });
    this.saveSync();
    return proj;
  }

  public deleteProject(projectId: string): boolean {
    const idx = this.data.projects.findIndex((p) => p.id === projectId);
    if (idx === -1) return false;
    this.data.projects.splice(idx, 1);
    this.data.tasks = this.data.tasks.filter((t) => t.projectId !== projectId);
    this.data.comments = this.data.comments.filter((c) => c.projectId !== projectId);
    this.data.releases = this.data.releases.filter((r) => r.projectId !== projectId);
    this.saveSync();
    return true;
  }

  // --- Tasks ---
  public getTasks(projectId: string): (Task & { assignee?: User; reporter?: User })[] {
    return this.data.tasks
      .filter((t) => t.projectId === projectId)
      .map((t) => ({
        ...t,
        assignee: t.assigneeId ? this.getUserById(t.assigneeId) : undefined,
        reporter: this.getUserById(t.reporterId),
      }))
      .sort((a, b) => a.position - b.position);
  }

  public getAllOrgTasks(organizationId: string): Task[] {
    return this.data.tasks.filter((t) => t.organizationId === organizationId);
  }

  public getTaskById(taskId: string): (Task & { assignee?: User; reporter?: User }) | undefined {
    const t = this.data.tasks.find((task) => task.id === taskId);
    if (!t) return undefined;
    return {
      ...t,
      assignee: t.assigneeId ? this.getUserById(t.assigneeId) : undefined,
      reporter: this.getUserById(t.reporterId),
    };
  }

  public createTask(task: Omit<Task, 'id' | 'key' | 'position' | 'version' | 'createdAt' | 'updatedAt'>): Task {
    const project = this.data.projects.find((p) => p.id === task.projectId);
    if (!project) throw new Error('Project not found');

    project.taskSequence = (project.taskSequence || 0) + 1;
    const taskKey = `${project.key}-${project.taskSequence}`;

    const existingInStatus = this.data.tasks.filter(
      (t) => t.projectId === task.projectId && t.status === task.status
    );

    const newTask: Task = {
      ...task,
      id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      key: taskKey,
      position: existingInStatus.length,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.data.tasks.push(newTask);
    this.saveSync();
    return newTask;
  }

  public updateTask(
    taskId: string,
    updates: Partial<Task>,
    clientVersion?: number
  ): { task?: Task; conflict?: boolean; currentVersion?: number } {
    const task = this.data.tasks.find((t) => t.id === taskId);
    if (!task) return {};

    // Optimistic Concurrency Control check:
    if (clientVersion !== undefined && clientVersion !== task.version) {
      return {
        conflict: true,
        currentVersion: task.version,
        task,
      };
    }

    Object.assign(task, updates, {
      version: task.version + 1,
      updatedAt: new Date().toISOString(),
    });

    this.saveSync();
    return { task };
  }

  public deleteTask(taskId: string): boolean {
    const idx = this.data.tasks.findIndex((t) => t.id === taskId);
    if (idx === -1) return false;
    this.data.tasks.splice(idx, 1);
    this.data.comments = this.data.comments.filter((c) => c.taskId !== taskId);
    this.saveSync();
    return true;
  }

  // --- Comments ---
  public getComments(taskId: string): (Comment & { author?: User })[] {
    return this.data.comments
      .filter((c) => c.taskId === taskId)
      .map((c) => ({
        ...c,
        author: this.getUserById(c.authorId),
      }))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  public createComment(comment: Omit<Comment, 'id' | 'createdAt' | 'updatedAt'>): Comment {
    const newComment: Comment = {
      ...comment,
      id: `comm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.comments.push(newComment);
    this.saveSync();
    return newComment;
  }

  public getCommentById(commentId: string): Comment | undefined {
    return this.data.comments.find((c) => c.id === commentId);
  }

  public getReleaseById(releaseId: string): Release | undefined {
    return this.data.releases.find((r) => r.id === releaseId);
  }

  public deleteComment(commentId: string): boolean {
    const idx = this.data.comments.findIndex((c) => c.id === commentId);
    if (idx === -1) return false;
    this.data.comments.splice(idx, 1);
    this.saveSync();
    return true;
  }

  // --- Releases ---
  public getReleases(organizationId: string, projectId?: string): Release[] {
    let list = this.data.releases.filter((r) => r.organizationId === organizationId);
    if (projectId) {
      list = list.filter((r) => r.projectId === projectId);
    }
    return list.sort((a, b) => new Date(b.targetDate).getTime() - new Date(a.targetDate).getTime());
  }

  public createRelease(release: Omit<Release, 'id' | 'createdAt' | 'updatedAt'>): Release {
    const newRelease: Release = {
      ...release,
      id: `rel_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.releases.push(newRelease);
    this.saveSync();
    return newRelease;
  }

  public updateRelease(releaseId: string, updates: Partial<Release>): Release | undefined {
    const rel = this.data.releases.find((r) => r.id === releaseId);
    if (!rel) return undefined;
    Object.assign(rel, updates, { updatedAt: new Date().toISOString() });
    this.saveSync();
    return rel;
  }

  // --- Notifications ---
  public getNotifications(userId: string): Notification[] {
    return this.data.notifications
      .filter((n) => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public createNotification(notif: Omit<Notification, 'id' | 'createdAt' | 'read'>): Notification {
    const newNotif: Notification = {
      ...notif,
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      read: false,
      createdAt: new Date().toISOString(),
    };
    this.data.notifications.push(newNotif);
    this.saveSync();
    return newNotif;
  }

  public markNotificationAsRead(id: string): boolean {
    const notif = this.data.notifications.find((n) => n.id === id);
    if (!notif) return false;
    notif.read = true;
    this.saveSync();
    return true;
  }

  public markAllNotificationsAsRead(userId: string): void {
    for (const notif of this.data.notifications) {
      if (notif.userId === userId) {
        notif.read = true;
      }
    }
    this.saveSync();
  }

  // --- Activity Logs ---
  public getActivityLogs(organizationId: string, projectId?: string, taskId?: string): ActivityLog[] {
    return this.data.activityLogs
      .filter((a) => {
        if (a.organizationId !== organizationId) return false;
        if (projectId && a.projectId !== projectId) return false;
        if (taskId && a.taskId !== taskId) return false;
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 50);
  }

  public logActivity(log: Omit<ActivityLog, 'id' | 'createdAt'>): ActivityLog {
    const newLog: ActivityLog = {
      ...log,
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
    };
    this.data.activityLogs.unshift(newLog);
    if (this.data.activityLogs.length > 300) {
      this.data.activityLogs.pop();
    }
    this.saveSync();
    return newLog;
  }

  // --- Invitations ---
  public getInvitations(organizationId: string): Invitation[] {
    return this.data.invitations.filter((i) => i.organizationId === organizationId);
  }

  public createInvitation(inv: Omit<Invitation, 'id' | 'createdAt' | 'status'>): Invitation {
    const newInv: Invitation = {
      ...inv,
      id: `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    this.data.invitations.push(newInv);
    this.saveSync();
    return newInv;
  }

  public revokeInvitation(invitationId: string): boolean {
    const inv = this.data.invitations.find((i) => i.id === invitationId);
    if (!inv) return false;
    inv.status = 'revoked';
    this.saveSync();
    return true;
  }

  public acceptInvitation(token: string, userId: string): boolean {
    const inv = this.data.invitations.find((i) => i.token === token && i.status === 'pending');
    if (!inv) return false;
    inv.status = 'accepted';
    this.createMembership({
      organizationId: inv.organizationId,
      userId,
      role: inv.role,
      joinedAt: new Date().toISOString(),
    });
    this.saveSync();
    return true;
  }
}

export const db = new Storage();
