export function webmentionData(mentions, url) {
  return mentions.filter((entry) => entry['wm-target'] === url);
}

function getNestedProperty(obj, prop) {
  return prop.split('.').reduce((acc, key) => (acc != null ? acc[key] : undefined), obj);
}

export function webmentionProperty(mentions, url, property) {
  return mentions
    .filter((entry) => entry['wm-target'] === url)
    .map((entry) => getNestedProperty(entry, property))
    .filter((v) => v !== null && v !== undefined && v !== '');
}
