const sanitizeHTML = require('sanitize-html');

module.exports = function webmentionsForUrl(webmentions, url) {
  const allowedTypes = ['mention-of', 'in-reply-to'];
  const clean = (content) =>
    sanitizeHTML(content, {
      allowedTags: ['b', 'i', 'em', 'strong', 'a'],
      allowedAttributes: {
        a: ['href'],
      },
    });

  return webmentions
    .filter((entry) => entry['wm-target'] === url)
    .filter((entry) => allowedTypes.includes(entry['wm-property']))
    .filter((entry) => !!entry.content)
    .map((entry) => {
      const {html, text} = entry.content;
      entry.content.value = html ? clean(html) : clean(text);
      return entry;
    });
};
