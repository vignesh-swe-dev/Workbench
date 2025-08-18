import { Server as HttpServer } from 'node:http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import type { PresenceUser } from '../shared/types.ts';
import { db } from '../db/storage.ts';
import { readSessionFromCookieHeader } from '../auth/session.ts';

let io: SocketIOServer | null = null;
const activePresence = new Map<string, PresenceUser>(); // socketId -> PresenceUser

export function initSocketServer(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || true,
      credentials: true,
      methods: ['GET', 'POST'],
    },
    pingInterval: 10000,
    pingTimeout: 5000,
  });

  // Authenticate every socket from the session cookie. Never trust ids sent by the client.
  io.use((socket, next) => {
    const session = readSessionFromCookieHeader(socket.handshake.headers.cookie);
    const user = session ? db.getUserById(session.userId) : undefined;
    if (!user) return next(new Error('Unauthorized'));
    socket.data.userId = user.id;
    next();
  });

  io.on('connection', (socket: Socket) => {
    // console.log(`[Socket] Client connected: ${socket.id}`);

    // Join organization channel
    socket.on('join:org', ({ orgId }: { orgId: string }) => {
      const userId = socket.data.userId as string;
      if (!orgId || !db.getMembership(orgId, userId)) return;
      socket.join(`org:${orgId}`);
      // console.log(`[Socket] User ${userId} joined org:${orgId}`);
    });

    // Join project channel and update presence
    socket.on('join:project', ({ projectId, taskId }: { projectId: string; taskId?: string }) => {
      const userId = socket.data.userId as string;
      const project = projectId ? db.getProjectById(projectId) : undefined;
      if (!project || !db.getMembership(project.organizationId, userId)) return;
      socket.join(`project:${projectId}`);

      const user = db.getUserById(userId);
      if (user) {
        const presence: PresenceUser = {
          userId: user.id,
          userName: user.name,
          userAvatar: user.avatarUrl,
          projectId,
          taskId,
          lastActive: new Date().toISOString(),
        };
        activePresence.set(socket.id, presence);
        broadcastProjectPresence(projectId);
      }
    });

    // Leave project channel
    socket.on('leave:project', ({ projectId }: { projectId: string }) => {
      socket.leave(`project:${projectId}`);
      activePresence.delete(socket.id);
      broadcastProjectPresence(projectId);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      const presence = activePresence.get(socket.id);
      if (presence?.projectId) {
        activePresence.delete(socket.id);
        broadcastProjectPresence(presence.projectId);
      }
    });
  });

  return io;
}

function broadcastProjectPresence(projectId: string) {
  if (!io) return;
  const projectUsers: PresenceUser[] = [];
  const seenUserIds = new Set<string>();

  for (const presence of activePresence.values()) {
    if (presence.projectId === projectId && !seenUserIds.has(presence.userId)) {
      seenUserIds.add(presence.userId);
      projectUsers.push(presence);
    }
  }

  io.to(`project:${projectId}`).emit('presence:sync', projectUsers);
}

export function broadcastTaskEvent(
  organizationId: string,
  projectId: string,
  event: 'task:created' | 'task:updated' | 'task:deleted',
  data: any
) {
  if (!io) return;
  io.to(`project:${projectId}`).emit(event, data);
  io.to(`org:${organizationId}`).emit(event, data);
}

export function broadcastCommentEvent(
  projectId: string,
  event: 'comment:created' | 'comment:deleted',
  data: any
) {
  if (!io) return;
  io.to(`project:${projectId}`).emit(event, data);
}

export function broadcastNotification(userId: string, data: any) {
  if (!io) return;
  io.emit(`notification:${userId}`, data);
}

export function broadcastActivityEvent(organizationId: string, data: any) {
  if (!io) return;
  io.to(`org:${organizationId}`).emit('activity:created', data);
}

