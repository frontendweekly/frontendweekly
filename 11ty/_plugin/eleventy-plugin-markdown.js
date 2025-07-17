const markdownIt = require('markdown-it');
const markdownItAnchor = require('markdown-it-anchor');

module.exports = function (eleventyConfig, options = {}) {
  const markdownLib = markdownIt({
    html: true,
    breaks: true,
    linkify: true,
    ...options.markdownItOptions,
  })
    .use(markdownItAnchor, options.markdownItAnchorOptions || {});

  eleventyConfig.setLibrary('md', markdownLib);
}; 