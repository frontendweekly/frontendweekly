import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import eleventyFetch from '@11ty/eleventy-fetch';
import signale from 'signale';

// Load .env variables with dotenv
import dotenv from 'dotenv';
dotenv.config();

const API_ORIGIN = 'https://webmention.io/api/mentions.jf2';

export default async function () {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  let metadata = {};
  try {
    metadata = JSON.parse(readFileSync(join(__dirname, 'site.json'), 'utf8'));
  } catch (e) {
    signale.fatal('unable to read or parse site.json');
    return [];
  }
  const TOKEN = process.env.WEBMENTION_IO_TOKEN;

  async function fetchWebmentions() {
    const { webmention } = metadata;

    if (!webmention) {
      signale.fatal(
        'unable to fetch webmentions: no webmention specified in src/_data/site.json.'
      );
      return false;
    }

    if (!TOKEN) {
      signale.fatal(
        'unable to fetch webmentions: no access token specified in environment.'
      );
      return false;
    }

    const url = `${API_ORIGIN}?domain=${webmention}&token=${TOKEN}&per-page=999&sort-by=published`;

    try {
      const data = await eleventyFetch(url, {
        duration: '1d',
      });
      if (data?.children) {
        signale.info(
          `${data.children.length} webmentions fetched from {API_ORIGIN}?domain=${webmention}}`
        );
        return data;
      }
      signale.warn('No webmentions data available');
      return { children: [] };
    } catch (err) {
      signale.fatal(err);
      return { children: [] };
    }
  }

  const feed = await fetchWebmentions();
  if (feed === false) {
    return [];
  }
  if (feed?.children) {
    return feed.children;
  }
  return [];
}
