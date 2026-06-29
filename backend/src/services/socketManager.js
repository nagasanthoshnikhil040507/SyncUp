import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import Project from '../models/Project.js';
import Message from '../models/Message.js';
import User from '../models/User.js';

/**
 * socketManager.js
 *
 * Initialises Socket.IO on the Node HTTP server and handles all
 * real-time events for project chat rooms.
 *
 * Rooms:  Socket.IO room = `project:<projectId>`
 * Auth:   JWT token passed in socket.handshake.auth.token
 *
 * Events (client → server):
 *   join-project   { projectId }
 *   leave-project  { projectId }
 *   send-message   { projectId, message }
 *   delete-message { messageId, projectId }
 *   typing-start   { projectId }
 *   typing-stop    { projectId }
 *
 * Events (server → client):
 *   receive-message  { message }   — broadcast to room
 *   delete-message   { messageId } — broadcast to room
 *   typing-start     { userId, userName } — broadcast to room (excl. sender)
 *   typing-stop      { userId }    — broadcast to room (excl. sender)
 *   error            { message }   — sent only to the offending socket
 */

// Map: projectId → Set<{ userId, name }> — track who is in each room
const roomPresence = new Map();

const addToRoom = (projectId, user) => {
  if (!roomPresence.has(projectId)) roomPresence.set(projectId, new Map());
  roomPresence.get(projectId).set(user.userId, user);
};

const removeFromRoom = (projectId, userId) => {
  if (roomPresence.has(projectId)) {
    roomPresence.get(projectId).delete(userId);
    if (roomPresence.get(projectId).size === 0) roomPresence.delete(projectId);
  }
};

const getRoomMembers = (projectId) =>
  roomPresence.has(projectId)
    ? Array.from(roomPresence.get(projectId).values())
    : [];

export const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: env.CLIENT_URL,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // ── Authentication middleware ─────────────────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required'));

      const decoded = jwt.verify(token, env.JWT_SECRET);

      // JWT payload only contains { userId, email, role } — name is NOT included.
      // We must load name from the DB so sender info is correct in every broadcast.
      const dbUser = await User.findById(decoded.userId).select('name email').lean();
      if (!dbUser) return next(new Error('User not found'));

      socket.user = {
        userId: decoded.userId.toString(),
        name:   dbUser.name,
        email:  dbUser.email,
      };
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const { userId, name } = socket.user;
    console.log(`[Socket] Connected: ${name} (${userId}) — socket: ${socket.id}`);

    // Keep track of which rooms THIS socket has joined (for cleanup on disconnect)
    const joinedRooms = new Set();

    // ── join-project ─────────────────────────────────────────────────────────
    socket.on('join-project', async ({ projectId }) => {
      try {
        if (!projectId) return socket.emit('error', { message: 'projectId is required' });

        // Verify membership in DB
        const project = await Project.findById(projectId);
        if (!project) return socket.emit('error', { message: 'Project not found' });

        const isMember = project.members.some((m) => m.toString() === userId);
        if (!isMember)
          return socket.emit('error', { message: 'Access denied: not a project member' });

        const room = `project:${projectId}`;
        socket.join(room);
        joinedRooms.add(projectId);

        addToRoom(projectId, socket.user);

        // Broadcast updated online list to everyone in the room
        io.to(room).emit('online-members', { members: getRoomMembers(projectId) });

        console.log(`[Socket] ${name} joined room: ${room}`);
      } catch (err) {
        console.error('[Socket] join-project error:', err.message);
        socket.emit('error', { message: 'Failed to join project room' });
      }
    });

    // ── leave-project ────────────────────────────────────────────────────────
    socket.on('leave-project', ({ projectId }) => {
      const room = `project:${projectId}`;
      socket.leave(room);
      joinedRooms.delete(projectId);
      removeFromRoom(projectId, userId);
      io.to(room).emit('online-members', { members: getRoomMembers(projectId) });
      console.log(`[Socket] ${name} left room: ${room}`);
    });

    // ── send-message ─────────────────────────────────────────────────────────
    socket.on('send-message', async ({ projectId, message }) => {
      try {
        if (!projectId || !message?.trim())
          return socket.emit('error', { message: 'projectId and message are required' });

        // Verify still a member (re-check on every message)
        const project = await Project.findById(projectId).select('members');
        if (!project) return socket.emit('error', { message: 'Project not found' });

        const isMember = project.members.some((m) => m.toString() === userId);
        if (!isMember)
          return socket.emit('error', { message: 'Access denied' });

        // Persist to MongoDB
        const doc = await Message.create({
          project: projectId,
          sender:  userId,
          message: message.trim(),
        });

        // Use findById + populate (same pattern as message.controller.js)
        // so the broadcast always contains sender: { _id, name, email }
        const populated = await Message.findById(doc._id).populate('sender', 'name email');

        // Broadcast to everyone in the room (including sender)
        io.to(`project:${projectId}`).emit('receive-message', {
          message: populated,
        });
      } catch (err) {
        console.error('[Socket] send-message error:', err.message);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // ── delete-message ───────────────────────────────────────────────────────
    socket.on('delete-message', async ({ messageId, projectId }) => {
      try {
        const msg = await Message.findById(messageId);
        if (!msg) return socket.emit('error', { message: 'Message not found' });

        if (msg.sender.toString() !== userId)
          return socket.emit('error', { message: 'You can only delete your own messages' });

        await msg.deleteOne();

        // Broadcast deletion to room so all clients remove it from their list
        io.to(`project:${projectId}`).emit('delete-message', { messageId });
      } catch (err) {
        console.error('[Socket] delete-message error:', err.message);
        socket.emit('error', { message: 'Failed to delete message' });
      }
    });

    // ── typing-start ─────────────────────────────────────────────────────────
    socket.on('typing-start', ({ projectId }) => {
      socket.to(`project:${projectId}`).emit('typing-start', {
        userId,
        userName: name,
      });
    });

    // ── typing-stop ──────────────────────────────────────────────────────────
    socket.on('typing-stop', ({ projectId }) => {
      socket.to(`project:${projectId}`).emit('typing-stop', { userId });
    });

    // ── disconnect ───────────────────────────────────────────────────────────
    socket.on('disconnect', (reason) => {
      console.log(`[Socket] Disconnected: ${name} — reason: ${reason}`);
      // Clean up all rooms this socket was in
      for (const projectId of joinedRooms) {
        removeFromRoom(projectId, userId);
        io.to(`project:${projectId}`).emit('online-members', {
          members: getRoomMembers(projectId),
        });
      }
    });
  });

  return io;
};
