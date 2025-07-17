module.exports = function (collection, globPath) {
  const now = new Date();
  const livePosts = (post) => post.date <= now && !post.data.draft;
  return [
    ...collection.getFilteredByGlob(globPath).filter(livePosts),
  ].reverse();
}; 