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

}

export const db = new Storage();
