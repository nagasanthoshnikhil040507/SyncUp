import { io } from 'socket.io-client';

/**
 * socketClient.js
 *
 * Singleton Socket.IO client.
 * Connects once with the JWT token from localStorage.
 * The same socket instance is reused across all chat pages.
 *
 * Usage:
 *   import { getSocket } from '../socket/socketClient';
 *   const socket = getSocket();
 *   socket.emit('join-project', { projectId });
 */

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socketInstance = null;

export const getSocket = () => {
  if (!socketInstance) {
    const token = localStorage.getItem('token');
    socketInstance = io(SOCKET_URL, {
      auth: { token },
      // Reconnect automatically with exponential back-off
      reconnection:        true,
      reconnectionAttempts: Infinity,
      reconnectionDelay:   1000,
      reconnectionDelayMax: 10000,
      // Only connect when explicitly told to (lazy connect)
      autoConnect: true,
    });
  }
  return socketInstance;
};

/**
 * Destroy the socket (call on logout so next user gets a fresh connection)
 */
export const destroySocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
};
