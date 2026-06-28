/**
 * formatDate
 *
 * Converts a date/timestamp into human-readable relative time.
 * Used in message timestamps, conversation list, notifications.
 *
 * Examples:
 *   - "Just now"      (< 1 min ago)
 *   - "5m ago"         (< 1 hour ago)
 *   - "3h ago"         (< 24 hours ago)
 *   - "Yesterday"      (1 day ago)
 *   - "Mon"            (< 7 days ago)
 *   - "Jun 3"          (same year)
 *   - "Jun 3, 2025"    (different year)
 */

export const formatRelativeTime = (date) => {
  const now = new Date();
  const target = new Date(date);
  const diffMs = now - target;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay === 1) return 'Yesterday';

  if (diffDay < 7) {
    return target.toLocaleDateString('en-US', { weekday: 'short' });
  }

  if (now.getFullYear() === target.getFullYear()) {
    return target.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  return target.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

/**
 * Format time only (for message timestamps within a conversation).
 * Example: "2:45 PM"
 */
export const formatMessageTime = (date) => {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};
