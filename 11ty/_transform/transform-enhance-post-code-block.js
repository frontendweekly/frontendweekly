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
