#!/usr/bin/env zx

import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import matter from 'gray-matter';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const POSTS_DIR = resolve(__dirname, '../11ty/posts');

/**
 * Extract article data from a markdown post
 * @param {string} filePath - Path to the markdown file
 * @returns {Object} Extracted article data
 */
function extractArticlesFromPost(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const { content: markdownContent } = matter(content);

  const articles = [];
  const lines = markdownContent.split('\n');

  let currentArticle = null;
  let currentContent = [];
  let inInBrief = false;

  for (const line of lines) {
    // Check if we're entering In Brief section
    if (line.trim() === '## In Brief') {
      inInBrief = true;
      continue;
    }

    // Extract MUSTREAD and FEATURED articles
    if (line.startsWith('## [')) {
      // Save previous article if exists
      if (currentArticle) {
	currentArticle.content = currentContent.join('\n').trim();
	articles.push(currentArticle);
      }

      // Extract title and URL from markdown link
      const match = line.match(/## \[([^\]]+)\]\(([^)]+)\)/);
      if (match) {
	currentArticle = {
	  title: match[1],
	  url: match[2],
	  category: inInBrief ? 'INBRIEF' : (line.includes('####') ? 'MUSTREAD' : 'FEATURED'),
	  content: ''
	};
	currentContent = [];
      }
    }
    // Extract Japanese title for MUSTREAD
    else if (line.startsWith('#### ') && currentArticle) {
      currentArticle.japaneseTitle = line.replace('#### ', '').trim();
    }
    // Extract INBRIEF articles
    else if (inInBrief && line.startsWith('- **[') && line.includes('**: ')) {
      const match = line.match(/- \*\*\[([^\]]+)\]\(([^)]+)\)\*\*: (.+)/);
      if (match) {
	articles.push({
	  title: match[1],
	  url: match[2],
	  japaneseTitle: match[3],
	  category: 'INBRIEF',
	  content: ''
	});
      }
    }
    // Collect content for current article
    else if (currentArticle && line.trim() && !line.startsWith('##') && !line.startsWith('####')) {
      currentContent.push(line);
    }
  }

  // Add the last article
  if (currentArticle) {
    currentArticle.content = currentContent.join('\n').trim();
    articles.push(currentArticle);
  }

  return articles;
}

/**
 * Analyze writing style from existing posts
 * @param {number} sampleSize - Number of recent posts to analyze
 * @returns {Object} Style analysis data
 */
export function analyzeWritingStyle(sampleSize = 10) {
  try {
    // Get list of post files, sorted by date (newest first)
    const files = readdirSync(POSTS_DIR)
      .filter(file => file.endsWith('.md'))
      .sort((a, b) => {
	// Extract date from filename (YYYY-MM-DD-vXXX.md)
	const dateA = a.split('-v')[0];
	const dateB = b.split('-v')[0];
	return new Date(dateB) - new Date(dateA);
      })
      .slice(0, sampleSize);

    const allArticles = [];

    // Extract articles from each post
    for (const file of files) {
      const filePath = join(POSTS_DIR, file);
      const articles = extractArticlesFromPost(filePath);
      allArticles.push(...articles);
    }

    // Analyze patterns
    const analysis = {
      totalArticles: allArticles.length,
      categories: {
	MUSTREAD: allArticles.filter(a => a.category === 'MUSTREAD').length,
	FEATURED: allArticles.filter(a => a.category === 'FEATURED').length,
	INBRIEF: allArticles.filter(a => a.category === 'INBRIEF').length
      },
      translationPatterns: {},
      contentLengths: {
	MUSTREAD: [],
	FEATURED: [],
	INBRIEF: []
      },
      commonPhrases: [],
      technicalTerms: new Set()
    };

    // Analyze each category
    for (const article of allArticles) {
      // Content length analysis
      if (article.content) {
	analysis.contentLengths[article.category].push(article.content.length);
      }

      // Translation patterns
      if (article.japaneseTitle) {
	const englishTitle = article.title.toLowerCase();
	const japaneseTitle = article.japaneseTitle;

	if (!analysis.translationPatterns[englishTitle]) {
	  analysis.translationPatterns[englishTitle] = japaneseTitle;
	}
      }

      // Extract technical terms (words that appear in both English and Japanese)
      if (article.content) {
	const words = article.content.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+/g) || [];
	words.forEach(word => {
	  if (word.length > 1) {
	    analysis.technicalTerms.add(word);
	  }
	});
      }
    }

    // Calculate average content lengths
    for (const category in analysis.contentLengths) {
      const lengths = analysis.contentLengths[category];
      if (lengths.length > 0) {
	analysis.contentLengths[category] = {
	  average: Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length),
	  min: Math.min(...lengths),
	  max: Math.max(...lengths),
	  count: lengths.length
	};
      }
    }

    // Convert technical terms to array
    analysis.technicalTerms = Array.from(analysis.technicalTerms);

    return analysis;
  } catch (error) {
    console.error('Error analyzing writing style:', error);
    throw error;
  }
}

/**
 * Generate style guide for OpenAI prompts
 * @param {Object} analysis - Style analysis data
 * @returns {string} Formatted style guide
 */
export function generateStyleGuide(analysis) {
  const guide = `
# Frontend Weekly Writing Style Guide

## Content Length Guidelines
- MUSTREAD articles: ${analysis.contentLengths.MUSTREAD.average} characters average (${analysis.contentLengths.MUSTREAD.min}-${analysis.contentLengths.MUSTREAD.max})
- FEATURED articles: ${analysis.contentLengths.FEATURED.average} characters average (${analysis.contentLengths.FEATURED.min}-${analysis.contentLengths.FEATURED.max})
- INBRIEF articles: Japanese title only

## Translation Style
- Use natural, technical Japanese
- Maintain technical accuracy
- Use appropriate honorifics and formal tone
- Keep explanations concise but informative

## Common Technical Terms
${analysis.technicalTerms.slice(0, 20).map(term => `- ${term}`).join('\n')}

## Writing Tone
- Professional but accessible
- Focus on practical insights
- Explain technical concepts clearly
- Use active voice when possible
- Include specific examples when relevant

## Structure Guidelines
- MUSTREAD: Detailed explanation (2-3 paragraphs)
- FEATURED: Brief summary (1 paragraph)
- INBRIEF: Japanese title translation only
`;

  return guide;
}

/**
 * Get sample articles for style learning
 * @param {number} sampleSize - Number of recent posts to sample
 * @returns {Array} Sample articles with translations
 */
export function getSampleArticles(sampleSize = 5) {
  try {
    const files = readdirSync(POSTS_DIR)
      .filter(file => file.endsWith('.md'))
      .sort((a, b) => {
	const dateA = a.split('-v')[0];
	const dateB = b.split('-v')[0];
	return new Date(dateB) - new Date(dateA);
      })
      .slice(0, sampleSize);

    const samples = [];

    for (const file of files) {
      const filePath = join(POSTS_DIR, file);
      const articles = extractArticlesFromPost(filePath);

      // Add 1-2 articles from each category
      const mustread = articles.filter(a => a.category === 'MUSTREAD').slice(0, 1);
      const featured = articles.filter(a => a.category === 'FEATURED').slice(0, 1);
      const inbrief = articles.filter(a => a.category === 'INBRIEF').slice(0, 2);

      samples.push(...mustread, ...featured, ...inbrief);
    }

    return samples;
  } catch (error) {
    console.error('Error getting sample articles:', error);
    throw error;
  }
}

// Run analysis if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  const analysis = analyzeWritingStyle();
  console.log('Style Analysis Results:');
  console.log(JSON.stringify(analysis, null, 2));

  console.log('\nStyle Guide:');
  console.log(generateStyleGuide(analysis));
}