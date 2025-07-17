module.exports = function (collection, globPath, maxPostsPerPage) {
  const now = new Date();
  const livePosts = (post) => post.date <= now && !post.data.draft;
  return [...collection.getFilteredByGlob(globPath).filter(livePosts)]
    .reverse()
    .slice(0, maxPostsPerPage);
}; 