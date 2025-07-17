import markdownIt from 'markdown-it';
import markdownItAnchor from 'markdown-it-anchor';

export default function (eleventyConfig, options = {}) {
  const markdownLib = markdownIt({
    html: true,
    breaks: true,
    linkify: true,
    ...options.markdownItOptions,
  }).use(markdownItAnchor, options.markdownItAnchorOptions || {});

  eleventyConfig.setLibrary('md', markdownLib);
}
