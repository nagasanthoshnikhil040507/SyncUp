import axiosInstance from './axiosInstance';

/**
 * chatApi.js
 *
 * REST API calls for project chat.
 * Socket.IO handles real-time events; REST is used for initial history load.
 */

// GET /api/projects/:projectId/messages?before=<messageId>
export const getMessages = (projectId, before = null) => {
  const params = before ? { before } : {};
  return axiosInstance.get(`/projects/${projectId}/messages`, { params });
};

// DELETE /api/messages/:messageId
export const deleteMessage = (messageId) =>
  axiosInstance.delete(`/messages/${messageId}`);
