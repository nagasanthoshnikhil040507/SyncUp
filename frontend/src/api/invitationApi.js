import axiosInstance from './axiosInstance';

/**
 * invitationApi.js
 *
 * All API calls related to project invitations and team membership.
 * Every function returns the axios response data directly.
 */

// ── Invitations ───────────────────────────────────────────────────────────────

/**
 * Get all invitations for the logged-in user (pending + history).
 * GET /api/invitations
 */
export const getMyInvitations = () =>
  axiosInstance.get('/invitations');

/**
 * Accept a specific invitation.
 * POST /api/invitations/:invitationId/accept
 */
export const acceptInvitation = (invitationId) =>
  axiosInstance.post(`/invitations/${invitationId}/accept`);

/**
 * Reject a specific invitation.
 * POST /api/invitations/:invitationId/reject
 */
export const rejectInvitation = (invitationId) =>
  axiosInstance.post(`/invitations/${invitationId}/reject`);

// ── Members ───────────────────────────────────────────────────────────────────

/**
 * Invite a user to a project by email (owner only).
 * POST /api/projects/:projectId/invite
 */
export const inviteToProject = (projectId, email) =>
  axiosInstance.post(`/projects/${projectId}/invite`, { email });

/**
 * Remove a member from a project (owner only).
 * DELETE /api/projects/:projectId/members/:memberId
 */
export const removeMember = (projectId, memberId) =>
  axiosInstance.delete(`/projects/${projectId}/members/${memberId}`);
