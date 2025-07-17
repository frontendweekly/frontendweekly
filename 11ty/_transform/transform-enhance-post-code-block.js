/**
 * Transforms code blocks to include language data attributes
 * @param {string} content - HTML content to transform
 * @param {string} outputPath - Output file path
 * @returns {string} Transformed HTML content with enhanced code blocks
 */
export default function (content, outputPath) {
  if (outputPath?.endsWith('.html')) {
    return content.replace(
      /<pre><code class="language-([^"]+)">([\s\S]*?)<\/code><\/pre>/g,
      (_match, lang, code) => {
        return `<pre data-lang="${lang}"><code class="language-${lang}">${code}</code></pre>`;
      }
    );
  }
  return content;
}
