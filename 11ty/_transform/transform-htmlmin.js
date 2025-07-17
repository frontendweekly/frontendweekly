import htmlmin from 'html-minifier-terser';

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
