module.exports = function (content, outputPath) {
  if (outputPath && outputPath.endsWith('.html')) {
    return content.replace(/<iframe /g, '<iframe loading="lazy" ');
  }
  return content;
}; 