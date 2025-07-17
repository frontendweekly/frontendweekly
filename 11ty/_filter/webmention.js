export function webmentionData(mentions, url) {
  return mentions.filter((entry) => entry['wm-target'] === url);
}

export function webmentionProperty(mentions, url, property) {
  return mentions
    .filter((entry) => entry['wm-target'] === url)
    .map((entry) => entry[property])
    .filter(Boolean);
}
