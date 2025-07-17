module.exports = function (content, outputPath) {
  if (outputPath && outputPath.endsWith('.html')) {
    return content.replace(/<pre><code class="language-([^"]+)">([\s\S]*?)<\/code><\/pre>/g, (match, lang, code) => {
      return `<pre data-lang="${lang}"><code class="language-${lang}">${code}</code></pre>`;
    });
  }
  return content;
}; 