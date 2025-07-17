/**
 * Filters webmentions by target URL
 * @param {Array} mentions - Array of webmention objects
 * @param {string} url - Target URL to filter by
 * @returns {Array} Filtered array of webmentions for the specified URL
 */
export function webmentionData(mentions, url) {
  return mentions.filter((entry) => entry['wm-target'] === url);
}

/**
 * Gets a nested property from an object using dot notation
 * @param {Object} obj - Object to get property from
 * @param {string} prop - Property path in dot notation (e.g., "author.name")
 * @returns {*} Property value or undefined if not found
 */
function getNestedProperty(obj, prop) {
  return prop.split('.').reduce((acc, key) => (acc != null ? acc[key] : undefined), obj);
}

/**
 * Extracts a specific property from webmentions for a given URL
 * @param {Array} mentions - Array of webmention objects
 * @param {string} url - Target URL to filter by
 * @param {string} property - Property path in dot notation to extract
 * @returns {Array} Array of property values from matching webmentions
 */
export function webmentionProperty(mentions, url, property) {
  return mentions
    .filter((entry) => entry['wm-target'] === url)
    .map((entry) => getNestedProperty(entry, property))
    .filter((v) => v !== null && v !== undefined && v !== '');
}
