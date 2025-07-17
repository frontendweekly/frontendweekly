/**
 * Global data object for Eleventy site configuration
 * @type {Object}
 */
export default {
  /** Current environment (development, production, etc.) */
  environment: process.env.ELEVENTY_ENV,

  /**
   * Generates a random UUID-like string
   * @returns {string} A random string in format xxxxxxxx-xxxxxxxx-xxxxxxxx
   */
  random() {
    const segment = () => {
      return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    };
    return `${segment()}-${segment()}-${segment()}`;
  },

  /** Current timestamp in milliseconds */
  now: Date.now(),
};
