/**
 * Utility functions for safe regex operations
 */

/**
 * Escapes special regex characters in a string to prevent regex injection
 * @param {string} string - The string to escape
 * @returns {string} - The escaped string safe for regex use
 */
export const escapeRegex = (string) => {
  if (!string || typeof string !== 'string') {
    return '';
  }
  
  // Escape all special regex characters
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Creates a safe regex pattern for case-insensitive matching
 * @param {string} string - The string to create regex pattern for
 * @returns {object} - MongoDB regex query object
 */
export const createSafeRegex = (string) => {
  const escaped = escapeRegex(string);
  return { $regex: escaped, $options: 'i' };
};

/**
 * Creates a safe case-insensitive RegExp object
 * @param {string} string - The string to create RegExp for
 * @returns {RegExp} - Safe RegExp object
 */
export const createSafeRegExp = (string) => {
  const escaped = escapeRegex(string);
  return new RegExp(escaped, 'i');
};
