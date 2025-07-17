import htmlmin from 'html-minifier-terser';

/**
 * Minifies HTML content for production builds
 * @param {string} content - HTML content to minify
 * @param {string} outputPath - Output file path
 * @returns {Promise<string>} Minified HTML content
 */
export default async function (content, outputPath) {
  if (outputPath?.endsWith('.html')) {
    return await htmlmin.minify(content, {
      collapseWhitespace: 'aggressive',
      removeComments: true,
      minifySvg: false,
    });
  }
  return content;
}
