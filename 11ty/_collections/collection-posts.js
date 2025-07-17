/**
 * Creates a collection of published posts filtered by glob pattern
 * @param {Object} collection - Eleventy collection object
 * @param {string} globPath - Glob pattern to match files
 * @returns {Array} Array of published posts sorted by date (newest first)
 */
export default function (collection, globPath) {
  const now = new Date();
  const livePosts = (post) => post.date <= now && !(post.data?.draft);
  return [
    ...collection.getFilteredByGlob(globPath).filter(livePosts),
  ].reverse();
}
