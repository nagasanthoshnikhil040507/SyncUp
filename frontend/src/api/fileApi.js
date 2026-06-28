import axiosInstance from './axiosInstance';

/**
 * fileApi.js
 *
 * All API calls related to project file sharing.
 * Upload uses multipart/form-data (FormData).
 * Download uses arraybuffer responseType so we can stream into a Blob URL.
 */

// ── GET /api/projects/:projectId/files ────────────────────────────────────────
export const getProjectFiles = (projectId) =>
  axiosInstance.get(`/projects/${projectId}/files`);

// ── POST /api/projects/:projectId/files ───────────────────────────────────────
// `file`    — File object from input or drop zone
// `onUploadProgress` — callback for progress bar (AxiosProgressEvent)
export const uploadProjectFile = (projectId, file, onUploadProgress) => {
  const formData = new FormData();
  formData.append('file', file);
  return axiosInstance.post(`/projects/${projectId}/files`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress,
  });
};

// ── DELETE /api/files/:fileId ─────────────────────────────────────────────────
export const deleteProjectFile = (fileId) =>
  axiosInstance.delete(`/files/${fileId}`);

// ── GET /api/files/:fileId/download ──────────────────────────────────────────
// Returns arraybuffer so we can create a Blob URL for in-browser preview or download
export const downloadProjectFile = (fileId) =>
  axiosInstance.get(`/files/${fileId}/download`, { responseType: 'arraybuffer' });
