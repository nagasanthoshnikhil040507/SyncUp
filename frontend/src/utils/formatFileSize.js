/**
 * formatFileSize
 *
 * Converts bytes into human-readable file size.
 * Used in file sharing preview components.
 *
 * Examples:
 *   - formatFileSize(1024)     → "1.0 KB"
 *   - formatFileSize(2500000)  → "2.4 MB"
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${units[i]}`;
};
