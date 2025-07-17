export default function (content, outputPath) {
  if (outputPath?.endsWith('.html')) {
    return content.replace(/<iframe /g, '<iframe loading="lazy" ');
  }
  return content;
}
