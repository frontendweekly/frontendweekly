/**
 * Creates a paginated collection of published posts for feed generation
 * @param {Object} collection - Eleventy collection object
 * @param {string} globPath - Glob pattern to match files
 * @param {number} maxPostsPerPage - Maximum number of posts to include
 * @returns {Array} Array of published posts limited by maxPostsPerPage, sorted by date (newest first)
 */
export default function (collection, globPath, maxPostsPerPage) {
  const now = new Date();
  const livePosts = (post) => post.date <= now && !(post.data?.draft);
  return [...collection.getFilteredByGlob(globPath).filter(livePosts)]
    .reverse()
    .slice(0, maxPostsPerPage);
}
