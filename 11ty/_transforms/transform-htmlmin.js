const htmlmin = require('html-minifier');

module.exports = function (content, outputPath) {
  if (outputPath && outputPath.endsWith('.html')) {
    return htmlmin.minify(content, {
      useShortDoctype: true,
      removeComments: true,
      collapseWhitespace: true,
    });
  }
  return content;
}; 