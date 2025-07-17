#!/usr/bin/env zx

import { $ } from 'zx';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import fg from 'fast-glob';
import matter from 'gray-matter';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const POSTS_DIR = resolve(__dirname, '../11ty/posts');

/**
 * Get the next volume number based on existing posts
 * @returns {number} The next volume number to use
 */
export function getNextVol() {
  const filepathes = (element) => basename(element, extname(element));
  const volume = (element) =>
    element.replace(
      /([12]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]))-(v)/g,
      ''
    );
  
  const latest = fg
    .sync(`${POSTS_DIR}/*.md`)
    .map(filepathes)
    .map(volume)
    .sort((a, b) => b - a)[0];
  
  return Number(latest) + 1;
}

/**
 * Get the next Wednesday date in YYYY-MM-DD format
 * @returns {string} Date string in YYYY-MM-DD format
 */
export function getNextWednesday() {
  const yyyymmddify = (date) => {
    return date.toISOString().split('T')[0];
  };

  const date = new Date();
  date.setDate(date.getDate() + ((3 + 7 - date.getDay()) % 7));
  // Adjust for Tokyo time
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return yyyymmddify(date);
}

/**
 * Fetch cards from Trello API
 * @returns {Promise<Array>} Array of Trello card objects
 * @throws {Error} When API request fails
 */
export async function getCards() {
  const TRELLO_API_URL_PREFIX = 'https://api.trello.com/1/lists/';
  const TRELLO_API = {
    access_token_key: process.env.TRELLO_API_TOKEN_KEY,
    access_token_secret: process.env.TRELLO_API_TOKEN_SECRET,
  };
  const TRELLO_FE_WEEKLY_LIST = process.env.TRELLO_FE_WEEKLY_LIST;

  const params = new URLSearchParams({
    attachments: 'true',
    card_attachment_fields: 'url',
    fields: 'id,name,desc,labels',
    key: TRELLO_API.access_token_key,
    token: TRELLO_API.access_token_secret,
  });

  try {
    const requestURL = `${TRELLO_API_URL_PREFIX}${TRELLO_FE_WEEKLY_LIST}/cards?${params}`;
    const response = await fetch(requestURL, { method: 'GET' });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (err) {
    console.error('Failed to fetch Trello cards:', err);
    throw err;
  }
}

/**
 * Transform Trello response using jq-like filtering
 * @param {Array} response - Raw Trello API response
 * @returns {Promise<Array>} Transformed card data with id, title, desc, and label
 * @throws {Error} When transformation fails
 */
export async function transformResponse(response) {
  const json = JSON.stringify(response, null, 2);
  const baseSchema = '.[] |= { id: .id, title: .name, desc: .desc, label: .labels[].name }';
  
  try {
    const result = await $`echo '${json}' | jq '${baseSchema}'`;
    return JSON.parse(result.stdout);
  } catch (error) {
    console.error('Failed to transform response:', error);
    throw error;
  }
}

/**
 * Extract URL from description using regex
 * @param {string} description - Card description containing URL
 * @returns {string} Extracted URL
 * @throws {Error} When no URL is found in description
 */
export function extractURL(description) {
  const regex = /https?:\/\/(www\.)?[-\w@:%.+~#=]{1,256}\.[a-z\d()]{1,6}\b([-\w()!@:%+.~#?&/=]*)/i;
  try {
    return description.match(regex)[0];
  } catch (err) {
    console.error('No URL found in description:', description);
    throw new Error('No URL found in description');
  }
}

/**
 * Generate MUSTREAD section from template data
 * @param {Array} tmplData - Transformed card data
 * @returns {string} Markdown formatted MUSTREAD section
 */
export function generateMustread(tmplData) {
  const isMustRead = (element) => element.label === 'MUSTREAD';
  const mustRead = (element) => `
## [${element.title}](${extractURL(element.desc)})
#### TRANSLATED TITLE

FILL ME

`;

  return tmplData.filter(isMustRead).map(mustRead).join('');
}

/**
 * Generate FEATURED section from template data
 * @param {Array} tmplData - Transformed card data
 * @returns {string} Markdown formatted FEATURED section
 */
export function generateFeatured(tmplData) {
  const isFeatured = (element) => element.label === 'FEATURED';
  const featured = (element) => `
## [${element.title}](${extractURL(element.desc)})

FILL ME

`;

  return tmplData.filter(isFeatured).map(featured).join('');
}

/**
 * Generate In Brief heading
 * @returns {string} Markdown heading for In Brief section
 */
export function generateInBriefHeading() {
  return '## In Brief';
}

/**
 * Generate INBRIEF section from template data
 * @param {Array} tmplData - Transformed card data
 * @returns {string} Markdown formatted INBRIEF section
 */
export function generateInbrief(tmplData) {
  const isInBrief = (element) => element.label === 'INBRIEF';
  const inBrief = (element) =>
    `
- **[${element.title}](${extractURL(element.desc)})**: TRANSLATED TITLE
`;

  return tmplData.filter(isInBrief).map(inBrief).join('');
}

/**
 * Generate the complete content with front matter
 * @param {Array} tmplData - Transformed card data
 * @param {Object} options - Options for content generation
 * @param {number} options.title - Volume number (defaults to next volume)
 * @param {string} options.date - Publish date (defaults to next Wednesday)
 * @returns {string} Complete markdown content with front matter
 */
export function generateContent(tmplData, options = {}) {
  const file = () => {
    return `
${generateMustread(tmplData)}
${generateFeatured(tmplData)}
${generateInBriefHeading()}
${generateInbrief(tmplData)}`;
  };

  const vol = options.title || getNextVol();
  return matter.stringify(file(), {
    title: `Vol.${vol}`,
    date: options.date || getNextWednesday(),
    desc: `3 OF TRANSLATED TITLE、ほか計${tmplData.length}リンク`,
    permalink: `/posts/${vol}/`,
  });
}

/**
 * Prompt user for input (volume number and date)
 * @returns {Promise<Object>} Object containing title and date
 */
export async function promptUser() {
  const nextVol = getNextVol();
  const nextDate = getNextWednesday();
  
  const title = await question(`Enter next vol number. Next one should be ${nextVol}: `);
  const date = await question(`Enter next publish date. Next one should be ${nextDate}: `);
  
  return { title: title || nextVol, date: date || nextDate };
}

/**
 * Save the generated content to a file
 * @param {string} content - Markdown content to save
 * @param {Object} options - Options for file naming
 * @param {number} options.title - Volume number
 * @param {string} options.date - Publish date
 * @returns {string} Path to the created file
 * @throws {Error} When file write fails
 */
export function saveContent(content, options) {
  const title = options.title || getNextVol();
  const date = options.date || getNextWednesday();
  const filePath = `${POSTS_DIR}/${date}-v${title}.md`;
  
  try {
    writeFileSync(filePath, content, 'utf-8');
    console.log(`✅ Created new post: ${filePath}`);
    return filePath;
  } catch (err) {
    console.error('Failed to save file:', err);
    throw err;
  }
}

/**
 * Main function that orchestrates the entire process
 * @returns {Promise<void>}
 * @throws {Error} When any step in the process fails
 */
export async function main() {
  try {
    console.log('🔄 Fetching Trello cards...');
    const cards = await getCards();
    
    console.log('🔄 Transforming data...');
    const tmpl = await transformResponse(cards);
    
    console.log('📝 Prompting for user input...');
    const options = await promptUser();
    
    console.log('🔄 Generating content...');
    const content = generateContent(tmpl, options);
    
    console.log('💾 Saving file...');
    const filePath = saveContent(content, options);
    
    console.log(`🎉 Successfully created: ${filePath}`);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
} 