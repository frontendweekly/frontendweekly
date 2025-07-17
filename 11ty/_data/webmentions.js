import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import eleventyFetch from '@11ty/eleventy-fetch';
import signale from 'signale';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const metadata = JSON.parse(readFileSync(join(__dirname, 'site.json'), 'utf8'));

// Load .env variables with dotenv
import dotenv from 'dotenv';
dotenv.config();

// Configuration Parameters
const API_ORIGIN = 'https://webmention.io/api/mentions.jf2';
const TOKEN = process.env.WEBMENTION_IO_TOKEN;

/**
 *
 */
async function fetchWebmentions() {
  const { webmention } = metadata;

  if (!webmention) {
    // If we dont have a domain name, abort
    signale.fatal(
      'unable to fetch webmentions: no webmention specified in src/_data/site.json.'
    );
    return false;
  }

  if (!TOKEN) {
    // If we dont have a domain access token, abort
    signale.fatal(
      'unable to fetch webmentions: no access token specified in environment.'
    );
    return false;
  }

  const url = `${API_ORIGIN}?domain=${webmention}&token=${TOKEN}&per-page=999&sort-by=published`;

  try {
    const response = await eleventyFetch(url, {
      duration: '1d',
    });
    const data = await response;

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

export default async function () {
  const feed = await fetchWebmentions();
  if (feed?.children) {
    return feed.children;
  }
  return [];
}
