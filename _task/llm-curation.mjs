#!/usr/bin/env zx

import { $, question } from 'zx';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import fg from 'fast-glob';
import matter from 'gray-matter';
import dotenv from '@dotenvx/dotenvx';
import OpenAI from 'openai';
import { chromium } from 'playwright';

// Import original template functions for fallback
import {
  generateMustread as generateMustreadTemplate,
  generateFeatured as generateFeaturedTemplate,
  generateInbrief as generateInbriefTemplate,
  generateInBriefHeading as generateInBriefHeadingTemplate
} from './node-trello-contents.mjs';

// Load environment variables
dotenv.config();

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const POSTS_DIR = resolve(__dirname, '../11ty/posts');

// LLM Configuration
const LLM_CONFIG = {
  enabled: process.env.LLM_ENABLED !== 'false', // Default to true unless explicitly disabled
  fallbackOnError: true, // Always fallback to template on error
  maxRetries: 2, // Number of retries for LLM operations
};

/**
 * Check if LLM processing is available
 * @returns {boolean} True if LLM processing is available
 */
export function isLLMAvailable() {
  return LLM_CONFIG.enabled && !!process.env.OPENAI_API_KEY;
}

// Initialize OpenAI client conditionally
let openai = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

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
 * Extract article content from URL using Playwright
 * @param {string} url - URL to extract content from
 * @returns {Promise<string>} Extracted article content
 */
export async function extractArticleContent(url) {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    
    // Extract main content - this is a basic approach
    // You might want to customize this based on the sites you're targeting
    const content = await page.evaluate(() => {
      // Try to find the main content area
      const selectors = [
        'article',
        '[role="main"]',
        '.content',
        '.post-content',
        '.article-content',
        'main',
        '.entry-content'
      ];
      
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          return element.innerText.trim();
        }
      }
      
      // Fallback to body content
      return document.body.innerText.trim();
    });
    
    return content.substring(0, 2000); // Limit content length
  } finally {
    await browser.close();
  }
}

/**
 * Analyze writing style from existing posts
 * @returns {Promise<string>} Writing style analysis
 */
export async function analyzeWritingStyle() {
  if (!openai) {
    throw new Error('OpenAI client not available');
  }

  try {
    const posts = fg.sync(`${POSTS_DIR}/*.md`).slice(-5); // Get last 5 posts
    const sampleContent = posts.map(post => readFileSync(post, 'utf-8')).join('\n\n');
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are analyzing the writing style of a Japanese tech blog. Extract key characteristics of the writing style, tone, and translation patterns.'
        },
        {
          role: 'user',
          content: `Analyze the writing style from these sample posts and provide a summary of the key characteristics:\n\n${sampleContent}`
        }
      ],
      max_tokens: 500,
      temperature: 0.3
    });
    
    return response.choices[0].message.content;
  } catch (error) {
    console.warn('Could not analyze writing style, using default:', error.message);
    return 'Professional, concise Japanese translations with technical accuracy';
  }
}

/**
 * Generate Japanese translation and excerpt for an article
 * @param {string} title - English title
 * @param {string} url - Article URL
 * @param {string} content - Article content
 * @param {string} writingStyle - Writing style analysis
 * @param {string} section - Section type (MUSTREAD, FEATURED, INBRIEF)
 * @returns {Promise<Object>} Object with translated title and excerpt
 */
export async function generateJapaneseContent(title, url, content, writingStyle, section) {
  const isMustRead = section === 'MUSTREAD';
  const isFeatured = section === 'FEATURED';
  
  const prompt = `
You are translating and summarizing a tech article for a Japanese audience.

Writing style characteristics: ${writingStyle}

English title: ${title}
Article URL: ${url}
Article content: ${content.substring(0, 1000)}

Section type: ${section}

Please provide:
1. A natural Japanese translation of the title
2. ${isMustRead ? 'A detailed Japanese excerpt (2-3 sentences) explaining the key points and why it\'s important' : 
    isFeatured ? 'A brief Japanese excerpt (1-2 sentences) summarizing the main point' : 
    'A very brief Japanese translation of the title for the In Brief section'}

Format your response as JSON:
{
  "translatedTitle": "Japanese title here",
  "excerpt": "Japanese excerpt here"
}

Keep the tone professional and technical, suitable for a Japanese developer audience.
`;

  if (!openai) {
    throw new Error('OpenAI client not available');
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a professional translator specializing in tech content for Japanese audiences.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 300,
      temperature: 0.3
    });
    
    const result = JSON.parse(response.choices[0].message.content);
    return result;
  } catch (error) {
    console.error(`Error generating content for "${title}":`, error.message);
    return {
      translatedTitle: `[翻訳エラー] ${title}`,
      excerpt: 'コンテンツの生成中にエラーが発生しました。'
    };
  }
}

/**
 * Generate MUSTREAD section with LLM-enhanced content and fallback
 * @param {Array} tmplData - Transformed card data
 * @param {string} writingStyle - Writing style analysis
 * @returns {Promise<string>} Markdown formatted MUSTREAD section
 */
export async function generateMustread(tmplData, writingStyle) {
  // If LLM is disabled, use template immediately
  if (!LLM_CONFIG.enabled) {
    console.log('🤖 LLM disabled, using template for MUSTREAD section');
    return generateMustreadTemplate(tmplData);
  }

  const isMustRead = (element) => element.label === 'MUSTREAD';
  const mustReadItems = tmplData.filter(isMustRead);
  
  // If no MUSTREAD items, return empty string
  if (mustReadItems.length === 0) {
    return '';
  }

  let mustReadContent = '';
  let llmSuccessCount = 0;
  let fallbackCount = 0;
  
  for (const item of mustReadItems) {
    const url = extractURL(item.desc);
    console.log(`📖 Processing MUSTREAD: ${item.title}`);
    
    let processed = false;
    let retries = 0;

    while (!processed && retries < LLM_CONFIG.maxRetries) {
      try {
	const content = await extractArticleContent(url);
	const japaneseContent = await generateJapaneseContent(item.title, url, content, writingStyle, 'MUSTREAD');

	mustReadContent += `
## [${item.title}](${url})
#### ${japaneseContent.translatedTitle}

${japaneseContent.excerpt}

`;
	llmSuccessCount++;
	processed = true;
      } catch (error) {
	retries++;
	console.warn(`⚠️ LLM processing failed for "${item.title}" (attempt ${retries}/${LLM_CONFIG.maxRetries}):`, error.message);

	if (retries >= LLM_CONFIG.maxRetries) {
	  if (LLM_CONFIG.fallbackOnError) {
	    console.log(`🔄 Falling back to template for "${item.title}"`);
	    // Use template for this specific item
	    const templateItem = [item];
	    const templateContent = generateMustreadTemplate(templateItem);
	    mustReadContent += templateContent;
	    fallbackCount++;
	  } else {
	    mustReadContent += `
## [${item.title}](${url})
#### [翻訳エラー]

コンテンツの処理中にエラーが発生しました。

`;
	  }
	  processed = true;
	}
      }
    }
  }
  
  console.log(`📊 MUSTREAD processing complete: ${llmSuccessCount} LLM success, ${fallbackCount} fallback`);
  return mustReadContent;
}

/**
 * Generate FEATURED section with LLM-enhanced content and fallback
 * @param {Array} tmplData - Transformed card data
 * @param {string} writingStyle - Writing style analysis
 * @returns {Promise<string>} Markdown formatted FEATURED section
 */
export async function generateFeatured(tmplData, writingStyle) {
  // If LLM is disabled, use template immediately
  if (!LLM_CONFIG.enabled) {
    console.log('🤖 LLM disabled, using template for FEATURED section');
    return generateFeaturedTemplate(tmplData);
  }

  const isFeatured = (element) => element.label === 'FEATURED';
  const featuredItems = tmplData.filter(isFeatured);
  
  // If no FEATURED items, return empty string
  if (featuredItems.length === 0) {
    return '';
  }

  let featuredContent = '';
  let llmSuccessCount = 0;
  let fallbackCount = 0;
  
  for (const item of featuredItems) {
    const url = extractURL(item.desc);
    console.log(`⭐ Processing FEATURED: ${item.title}`);
    
    let processed = false;
    let retries = 0;

    while (!processed && retries < LLM_CONFIG.maxRetries) {
      try {
	const content = await extractArticleContent(url);
	const japaneseContent = await generateJapaneseContent(item.title, url, content, writingStyle, 'FEATURED');

	featuredContent += `
## [${item.title}](${url})

${japaneseContent.excerpt}

`;
	llmSuccessCount++;
	processed = true;
      } catch (error) {
	retries++;
	console.warn(`⚠️ LLM processing failed for "${item.title}" (attempt ${retries}/${LLM_CONFIG.maxRetries}):`, error.message);

	if (retries >= LLM_CONFIG.maxRetries) {
	  if (LLM_CONFIG.fallbackOnError) {
	    console.log(`🔄 Falling back to template for "${item.title}"`);
	    // Use template for this specific item
	    const templateItem = [item];
	    const templateContent = generateFeaturedTemplate(templateItem);
	    featuredContent += templateContent;
	    fallbackCount++;
	  } else {
	    featuredContent += `
## [${item.title}](${url})

コンテンツの処理中にエラーが発生しました。

`;
	  }
	  processed = true;
	}
      }
    }
  }
  
  console.log(`📊 FEATURED processing complete: ${llmSuccessCount} LLM success, ${fallbackCount} fallback`);
  return featuredContent;
}

/**
 * Generate In Brief heading
 * @returns {string} Markdown heading for In Brief section
 */
export function generateInBriefHeading() {
  return '## In Brief';
}

/**
 * Generate INBRIEF section with LLM-enhanced content and fallback
 * @param {Array} tmplData - Transformed card data
 * @param {string} writingStyle - Writing style analysis
 * @returns {Promise<string>} Markdown formatted INBRIEF section
 */
export async function generateInbrief(tmplData, writingStyle) {
  // If LLM is disabled, use template immediately
  if (!LLM_CONFIG.enabled) {
    console.log('🤖 LLM disabled, using template for INBRIEF section');
    return generateInbriefTemplate(tmplData);
  }

  const isInBrief = (element) => element.label === 'INBRIEF';
  const inBriefItems = tmplData.filter(isInBrief);
  
  // If no INBRIEF items, return empty string
  if (inBriefItems.length === 0) {
    return '';
  }

  let inBriefContent = '';
  let llmSuccessCount = 0;
  let fallbackCount = 0;
  
  for (const item of inBriefItems) {
    const url = extractURL(item.desc);
    console.log(`📝 Processing INBRIEF: ${item.title}`);
    
    let processed = false;
    let retries = 0;

    while (!processed && retries < LLM_CONFIG.maxRetries) {
      try {
	const content = await extractArticleContent(url);
	const japaneseContent = await generateJapaneseContent(item.title, url, content, writingStyle, 'INBRIEF');

	inBriefContent += `
- **[${item.title}](${url})**: ${japaneseContent.translatedTitle}
`;
	llmSuccessCount++;
	processed = true;
      } catch (error) {
	retries++;
	console.warn(`⚠️ LLM processing failed for "${item.title}" (attempt ${retries}/${LLM_CONFIG.maxRetries}):`, error.message);

	if (retries >= LLM_CONFIG.maxRetries) {
	  if (LLM_CONFIG.fallbackOnError) {
	    console.log(`🔄 Falling back to template for "${item.title}"`);
	    // Use template for this specific item
	    const templateItem = [item];
	    const templateContent = generateInbriefTemplate(templateItem);
	    inBriefContent += templateContent;
	    fallbackCount++;
	  } else {
	    inBriefContent += `
- **[${item.title}](${url})**: [翻訳エラー]
`;
	  }
	  processed = true;
	}
      }
    }
  }
  
  console.log(`📊 INBRIEF processing complete: ${llmSuccessCount} LLM success, ${fallbackCount} fallback`);
  return inBriefContent;
}

/**
 * Generate the complete content with front matter and LLM-enhanced content
 * @param {Array} tmplData - Transformed card data
 * @param {Object} options - Options for content generation
 * @param {number} options.title - Volume number (defaults to next volume)
 * @param {string} options.date - Publish date (defaults to next Wednesday)
 * @returns {Promise<string>} Complete markdown content with front matter
 */
export async function generateContent(tmplData, options = {}) {
  // Check if LLM is enabled and OpenAI API key is available
  const llmAvailable = LLM_CONFIG.enabled && process.env.OPENAI_API_KEY;

  if (!llmAvailable) {
    console.log('🤖 LLM processing disabled or OpenAI API key not available, using template mode');
    console.log('📝 Generating content using original template...');

    const mustReadContent = generateMustreadTemplate(tmplData);
    const featuredContent = generateFeaturedTemplate(tmplData);
    const inBriefContent = generateInbriefTemplate(tmplData);

    const file = () => {
      return `
${mustReadContent}
${featuredContent}
${generateInBriefHeadingTemplate()}
${inBriefContent}`;
    };

    const vol = options.title || getNextVol();
    const mustReadCount = tmplData.filter(item => item.label === 'MUSTREAD').length;

    return matter.stringify(file(), {
      title: `Vol.${vol}`,
      date: options.date || getNextWednesday(),
      desc: `${mustReadCount} OF TRANSLATED TITLE、ほか計${tmplData.length}リンク`,
      permalink: `/posts/${vol}/`,
    });
  }

  console.log('🎨 Analyzing writing style...');
  let writingStyle;
  try {
    writingStyle = await analyzeWritingStyle();
  } catch (error) {
    console.warn('⚠️ Could not analyze writing style, using default:', error.message);
    writingStyle = 'Professional, concise Japanese translations with technical accuracy';
  }
  
  console.log('📝 Generating MUSTREAD section...');
  const mustReadContent = await generateMustread(tmplData, writingStyle);
  
  console.log('⭐ Generating FEATURED section...');
  const featuredContent = await generateFeatured(tmplData, writingStyle);
  
  console.log('📝 Generating INBRIEF section...');
  const inBriefContent = await generateInbrief(tmplData, writingStyle);
  
  const file = () => {
    return `
${mustReadContent}
${featuredContent}
${generateInBriefHeading()}
${inBriefContent}`;
  };

  const vol = options.title || getNextVol();
  const mustReadCount = tmplData.filter(item => item.label === 'MUSTREAD').length;
  
  return matter.stringify(file(), {
    title: `Vol.${vol}`,
    date: options.date || getNextWednesday(),
    desc: `${mustReadCount} OF TRANSLATED TITLE、ほか計${tmplData.length}リンク`,
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
    
    console.log('🤖 Generating content...');
    const content = await generateContent(tmpl, options);
    
    console.log('💾 Saving file...');
    const filePath = saveContent(content, options);
    
    console.log(`🎉 Successfully created: ${filePath}`);

    // Check if LLM was used
    if (LLM_CONFIG.enabled && process.env.OPENAI_API_KEY) {
      console.log('✨ The post includes Japanese translations and excerpts generated by AI!');
    } else {
      console.log('📝 The post was generated using the original template format.');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
} 