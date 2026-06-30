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
  // If the instance exists but is already disconnected (e.g. server restarted
  // while logged out, or destroySocket() was not called), kill it so we create
  // a fresh socket with the current user's token.
  if (socketInstance && !socketInstance.connected && !socketInstance.active) {
    socketInstance.disconnect();
    socketInstance = null;
  }

  if (!socketInstance) {
    socketInstance = io(SOCKET_URL, {
      // Use a callback so the token is re-read from localStorage on every
      // connection attempt — including automatic reconnects after a drop.
      auth: (cb) => cb({ token: localStorage.getItem('token') }),
      reconnection:         true,
      reconnectionAttempts: Infinity,
      reconnectionDelay:    1000,
      reconnectionDelayMax: 10000,
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
