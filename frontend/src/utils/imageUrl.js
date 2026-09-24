// src/utils/imageUrl.js
/**
 * Utility to construct full image URLs.
 * If the supplied path is already an absolute URL (starts with http:// or https://),
 * it is returned unchanged. Otherwise, the VITE_API_URL environment variable (if any)
 * is prefixed, ensuring exactly one slash between the base and the relative path.
 */
export const getImageUrl = (path) => {
  if (!path) return '';
  // Absolute URL?
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const base = import.meta.env.VITE_API_URL || '';
  const trimmedBase = base.replace(/\/+$/,'');
  const trimmedPath = path.replace(/^\/+/, '');
  return `${trimmedBase}/${trimmedPath}`;
};
