/**
 * Adds lazy loading attribute to iframe elements
 * @param {string} content - HTML content to transform
 * @param {string} outputPath - Output file path
 * @returns {string} Transformed HTML content with lazy-loaded iframes
 */
export default function (content, outputPath) {
  if (outputPath?.endsWith('.html')) {
    return content.replace(/<iframe /g, '<iframe loading="lazy" ');
  }
  return content;
}
