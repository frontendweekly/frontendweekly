import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import eleventyFetch from '@11ty/eleventy-fetch';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Fetches and processes Speedify performance data for the site
 * @returns {Promise<Object>} Object containing performance metrics and timestamp
 */
export default async function () {
  try {
    // Read site.json inside the function so it can be mocked in tests
    const site = JSON.parse(readFileSync(join(__dirname, 'site.json'), 'utf8'));
    
    const speedifyUrl = 'https://speedify.frontendweekly.tokyo';
    const speedify = await eleventyFetch(`${speedifyUrl}/api/urls.json`, {
      duration: '1d',
    });
    const urlWithOrigin = speedify[`${site.url}/`];

    if (!urlWithOrigin || !urlWithOrigin.hash) {
      console.warn('Speedify data not available for URL:', site.url);
      return {
        performance: 0,
        accessibility: 0,
        bestPractices: 0,
        seo: 0,
        timestamp: new Date().toISOString(),
      };
    }

    const hash = urlWithOrigin.hash;

    const response = await fetch(`${speedifyUrl}/api/${hash}.json`);
    const score = await response.json();

    const lighthouse = score.lighthouse;

    // Check if lighthouse data exists
    if (!lighthouse) {
      console.warn('Lighthouse data not available for hash:', hash);
      return {
        performance: 0,
        accessibility: 0,
        bestPractices: 0,
        seo: 0,
        timestamp: new Date().toISOString(),
      };
    }

    return Object.assign(lighthouse, {
      timestamp: score.timestamp,
      performance: Number.parseInt(lighthouse.performance * 100, 10),
      accessibility: Number.parseInt(lighthouse.accessibility * 100, 10),
      bestPractices: Number.parseInt(lighthouse.bestPractices * 100, 10),
      seo: Number.parseInt(lighthouse.seo * 100, 10),
    });
  } catch (error) {
    console.error('Error fetching speedify data:', error);
    return {
      performance: 0,
      accessibility: 0,
      bestPractices: 0,
      seo: 0,
      timestamp: new Date().toISOString(),
    };
  }
}
