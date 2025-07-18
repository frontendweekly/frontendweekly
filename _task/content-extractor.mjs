#!/usr/bin/env zx

import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Extract article content from a URL using Playwright
 * @param {string} url - URL to extract content from
 * @returns {Promise<Object>} Extracted content with metadata
 */
export async function extractArticleContent(url) {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // Set user agent to avoid being blocked
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    console.log(`🔍 Extracting content from: ${url}`);

    // Navigate to the page
    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // Extract metadata
    const metadata = await extractMetadata(page);

    // Extract main content
    const content = await extractMainContent(page);

    // Extract title
    const title = await extractTitle(page);

    return {
      url,
      title: title || metadata.title,
      author: metadata.author,
      date: metadata.date,
      content: content.trim(),
      wordCount: content.split(/\s+/).length,
      extractedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error(`❌ Error extracting content from ${url}:`, error.message);
    throw new Error(`Failed to extract content from ${url}: ${error.message}`);
  } finally {
    await browser.close();
  }
}

/**
 * Extract metadata from the page
 * @param {Page} page - Playwright page object
 * @returns {Promise<Object>} Metadata object
 */
async function extractMetadata(page) {
  try {
    const metadata = await page.evaluate(() => {
      const getMetaContent = (name, property) => {
	const meta = document.querySelector(`meta[name="${name}"], meta[property="${property}"]`);
	return meta ? meta.getAttribute('content') : null;
      };

      return {
	title: document.title || '',
	author: getMetaContent('author') ||
		getMetaContent('article:author') ||
		getMetaContent('twitter:creator') ||
		document.querySelector('[rel="author"]')?.textContent?.trim() ||
		document.querySelector('.author, .byline, [class*="author"]')?.textContent?.trim(),
	date: getMetaContent('article:published_time') ||
	      getMetaContent('date') ||
	      getMetaContent('og:updated_time') ||
	      document.querySelector('time')?.getAttribute('datetime') ||
	      document.querySelector('.date, .published, [class*="date"]')?.textContent?.trim()
      };
    });

    return metadata;
  } catch (error) {
    console.warn('Warning: Could not extract metadata:', error.message);
    return { title: '', author: '', date: '' };
  }
}

/**
 * Extract title from the page
 * @param {Page} page - Playwright page object
 * @returns {Promise<string>} Article title
 */
async function extractTitle(page) {
  try {
    const title = await page.evaluate(() => {
      // Try different selectors for article titles
      const selectors = [
	'h1',
	'h1.entry-title',
	'h1.post-title',
	'h1.article-title',
	'.entry-title',
	'.post-title',
	'.article-title',
	'[class*="title"]',
	'title'
      ];

      for (const selector of selectors) {
	const element = document.querySelector(selector);
	if (element && element.textContent.trim()) {
	  return element.textContent.trim();
	}
      }

      return '';
    });

    return title;
  } catch (error) {
    console.warn('Warning: Could not extract title:', error.message);
    return '';
  }
}

/**
 * Extract main content from the page
 * @param {Page} page - Playwright page object
 * @returns {Promise<string>} Main content text
 */
async function extractMainContent(page) {
  try {
    const content = await page.evaluate(() => {
      // Remove unwanted elements
      const selectorsToRemove = [
	'nav',
	'header',
	'footer',
	'.nav',
	'.header',
	'.footer',
	'.sidebar',
	'.comments',
	'.advertisement',
	'.ads',
	'[class*="ad-"]',
	'[class*="social"]',
	'[class*="share"]',
	'.menu',
	'.breadcrumb',
	'.pagination',
	'script',
	'style',
	'iframe'
      ];

      selectorsToRemove.forEach(selector => {
	const elements = document.querySelectorAll(selector);
	elements.forEach(el => el.remove());
      });

      // Try to find the main content area
      const contentSelectors = [
	'article',
	'.article',
	'.post',
	'.entry',
	'.content',
	'.main-content',
	'[role="main"]',
	'.post-content',
	'.entry-content',
	'.article-content',
	'main'
      ];

      let contentElement = null;

      for (const selector of contentSelectors) {
	const element = document.querySelector(selector);
	if (element && element.textContent.trim().length > 200) {
	  contentElement = element;
	  break;
	}
      }

      // If no specific content area found, use body
      if (!contentElement) {
	contentElement = document.body;
      }

      // Extract text content
      const extractText = (element) => {
	const walker = document.createTreeWalker(
	  element,
	  NodeFilter.SHOW_TEXT,
	  {
	    acceptNode: (node) => {
	      // Skip if parent is script, style, or hidden
	      const parent = node.parentElement;
	      if (!parent) return NodeFilter.FILTER_REJECT;

	      const style = window.getComputedStyle(parent);
	      if (style.display === 'none' || style.visibility === 'hidden') {
		return NodeFilter.FILTER_REJECT;
	      }

	      return NodeFilter.FILTER_ACCEPT;
	    }
	  }
	);

	const textNodes = [];
	let node;
	while (node = walker.nextNode()) {
	  const text = node.textContent.trim();
	  if (text) {
	    textNodes.push(text);
	  }
	}

	return textNodes.join(' ');
      };

      let text = extractText(contentElement);

      // Clean up the text
      text = text
	.replace(/\s+/g, ' ') // Replace multiple spaces with single space
	.replace(/\n\s*\n/g, '\n') // Replace multiple newlines with single newline
	.trim();

      return text;
    });

    return content;
  } catch (error) {
    console.error('Error extracting main content:', error.message);
    throw error;
  }
}

/**
 * Extract content from multiple URLs
 * @param {Array<string>} urls - Array of URLs to extract
 * @returns {Promise<Array>} Array of extracted content objects
 */
export async function extractMultipleArticles(urls) {
  const results = [];

  for (const url of urls) {
    try {
      const content = await extractArticleContent(url);
      results.push(content);
      console.log(`✅ Extracted: ${content.title} (${content.wordCount} words)`);
    } catch (error) {
      console.error(`❌ Failed to extract ${url}:`, error.message);
      results.push({
	url,
	title: '',
	author: '',
	date: '',
	content: '',
	wordCount: 0,
	error: error.message,
	extractedAt: new Date().toISOString()
      });
    }
  }

  return results;
}

/**
 * Validate if a URL is accessible and extractable
 * @param {string} url - URL to validate
 * @returns {Promise<boolean>} Whether the URL is valid
 */
export async function validateUrl(url) {
  try {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 15000
    });

    const status = await page.evaluate(() => {
      return {
	title: document.title,
	hasContent: document.body.textContent.length > 100
      };
    });

    await browser.close();

    return status.title && status.hasContent;
  } catch (error) {
    console.warn(`Warning: URL validation failed for ${url}:`, error.message);
    return false;
  }
}

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  const testUrl = process.argv[2];
  if (testUrl) {
    extractArticleContent(testUrl)
      .then(content => {
	console.log('Extracted content:');
	console.log(JSON.stringify(content, null, 2));
      })
      .catch(error => {
	console.error('Error:', error.message);
	process.exit(1);
      });
  } else {
    console.log('Usage: node content-extractor.mjs <url>');
  }
}