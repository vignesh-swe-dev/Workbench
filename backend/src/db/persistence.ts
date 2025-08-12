import fs from 'node:fs';
import path from 'node:path';
import { MongoClient, type Db } from 'mongodb';
import type { DatabaseSchema } from './storage.ts';

/**
 * The app keeps all data in memory (fast, simple) and writes every change through to
 * one of two stores:
 *   - a local JSON file          (default, no setup needed)
 *   - MongoDB                    (when MONGODB_URI is set)
 */
export interface Persistence {
  readonly label: string;
  /** Returns stored data, or null when nothing has been saved yet. */
  load(): Promise<Partial<DatabaseSchema> | null>;
  /** Called after every change. Must not throw. */
  save(data: DatabaseSchema): void;
  /** Wait until pending writes are stored (used on shutdown). */
  flush(): Promise<void>;
}

// ---------------------------------------------------------------- JSON file
export class FilePersistence implements Persistence {
  readonly label: string;
  private file: string;

  constructor(dataDir: string) {
    this.file = path.join(dataDir, 'workbench-db.json');
    this.label = `JSON file (${this.file})`;
    fs.mkdirSync(dataDir, { recursive: true });
  }

  async load() {
    if (!fs.existsSync(this.file)) return null;
    return JSON.parse(fs.readFileSync(this.file, 'utf-8'));
  }

  save(data: DatabaseSchema) {
    try {
      // write to a temp file first so a crash never leaves a half-written database
      const tmp = `${this.file}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tmp, this.file);
    } catch (err) {
      console.error('[Storage] Error writing database file:', err);
    }
  }

  async flush() {}
}

// ------------------------------------------------------------------ MongoDB
const COLLECTIONS = [
  'users',
  'organizations',
  'memberships',
  'projects',
  'tasks',
  'comments',
  'invitations',
  'notifications',
  'activityLogs',
  'releases',
] as const;

type Doc = Record<string, any>;

export class MongoPersistence implements Persistence {
  readonly label: string;
  private client: MongoClient;
  private db!: Db;
  // collection -> (document id -> serialized JSON) as last written, so we only write changes
  private written = new Map<string, Map<string, string>>();
  private pending: DatabaseSchema | null = null;
  private timer: NodeJS.Timeout | null = null;
  private running: Promise<void> = Promise.resolve();

  constructor(private uri: string) {
    this.client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
    this.label = `MongoDB (${uri.replace(/\/\/([^:@/]+):([^@/]+)@/, '//$1:****@')})`;
  }

  async load() {
    await this.client.connect();
    this.db = this.client.db(); // database name comes from the URI path, e.g. /workbench
    await this.db.command({ ping: 1 });

    await this.db.collection('users').createIndex({ email: 1 }, { unique: true });
    await this.db.collection('organizations').createIndex({ slug: 1 }, { unique: true });
    await this.db.collection('memberships').createIndex({ organizationId: 1, userId: 1 }, { unique: true });
    await this.db.collection('projects').createIndex({ organizationId: 1 });
    await this.db.collection('tasks').createIndex({ projectId: 1 });
    await this.db.collection('tasks').createIndex({ organizationId: 1 });
    await this.db.collection('comments').createIndex({ taskId: 1 });
    await this.db.collection('activityLogs').createIndex({ organizationId: 1, createdAt: -1 });

    const out: Doc = {};
    let total = 0;
    for (const name of COLLECTIONS) {
      const docs = await this.db.collection(name).find({}).toArray();
      const map = new Map<string, string>();
      out[name] = docs.map(({ _id, ...rest }) => {
        map.set(String(_id), JSON.stringify(rest));
        return rest;
      });
      this.written.set(name, map);
      total += docs.length;
    }

    const creds = await this.db.collection('credentials').find({}).toArray();
    const credMap = new Map<string, string>();
    out.credentials = {};
    for (const c of creds) {
      out.credentials[String(c._id)] = c.hash;
      credMap.set(String(c._id), JSON.stringify({ hash: c.hash }));
    }
    this.written.set('credentials', credMap);
    total += creds.length;

    return total === 0 ? null : (out as Partial<DatabaseSchema>);
  }

  save(data: DatabaseSchema) {
    this.pending = data;
    if (this.timer) return;
    // batch rapid changes (e.g. dragging cards) into one write
    this.timer = setTimeout(() => {
      this.timer = null;
      this.running = this.running.then(() => this.writePending());
    }, 150);
  }

  async flush() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
      this.running = this.running.then(() => this.writePending());
    }
    await this.running;
    await this.client.close();
  }

  private async writePending() {
    const data = this.pending;
    this.pending = null;
    if (!data) return;
    try {
      for (const name of COLLECTIONS) {
        await this.syncCollection(name, (data as any)[name] as Doc[], (d) => d.id);
      }
      const credDocs = Object.entries(data.credentials).map(([id, hash]) => ({ id, hash }));
      await this.syncCollection('credentials', credDocs, (d) => d.id);
    } catch (err) {
      console.error('[Storage] MongoDB write failed:', err);
    }
  }

  private async syncCollection(name: string, docs: Doc[], idOf: (d: Doc) => string) {
    const before = this.written.get(name) ?? new Map<string, string>();
    const after = new Map<string, string>();
    const ops: any[] = [];

    for (const d of docs) {
      const id = String(idOf(d));
      const { _id, ...rest } = d;
      const json = JSON.stringify(rest);
      after.set(id, json);
      if (before.get(id) !== json) {
        ops.push({ replaceOne: { filter: { _id: id }, replacement: rest, upsert: true } });
      }
    }
    for (const id of before.keys()) {
      if (!after.has(id)) ops.push({ deleteOne: { filter: { _id: id } } });
    }

    if (ops.length > 0) {
      await this.db.collection(name).bulkWrite(ops, { ordered: true });
    }
    this.written.set(name, after);
  }
}
