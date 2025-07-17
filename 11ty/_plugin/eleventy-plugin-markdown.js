import markdownIt from 'markdown-it';
import markdownItAnchor from 'markdown-it-anchor';

/**
 * Configures markdown processing for Eleventy with markdown-it and anchor plugin
 * @param {Object} eleventyConfig - Eleventy configuration object
 * @param {Object} options - Plugin options
 * @param {Object} options.markdownItOptions - Options for markdown-it
 * @param {Object} options.markdownItAnchorOptions - Options for markdown-it-anchor
 */
export default function (eleventyConfig, options = {}) {
  const markdownLib = markdownIt({
    html: true,
    breaks: true,
    linkify: true,
    ...options.markdownItOptions,
  }).use(markdownItAnchor, options.markdownItAnchorOptions || {});

  eleventyConfig.setLibrary('md', markdownLib);
}
