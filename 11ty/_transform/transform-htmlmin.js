import htmlmin from 'html-minifier';

export default function (content, outputPath) {
  if (outputPath?.endsWith('.html')) {
    return htmlmin.minify(content, {
      useShortDoctype: true,
      removeComments: true,
      collapseWhitespace: true,
    });
  }
  return content;
}
