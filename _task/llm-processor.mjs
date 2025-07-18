#!/usr/bin/env zx

import OpenAI from 'openai';
import dotenv from '@dotenvx/dotenvx';

// Load environment variables
dotenv.config();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate Japanese content for an article
 * @param {Object} article - Article object with content and metadata
 * @param {string} category - Article category (MUSTREAD, FEATURED, INBRIEF)
 * @param {Object} styleGuide - Writing style guide
 * @param {Array} sampleArticles - Sample articles for style learning
 * @returns {Promise<Object>} Generated Japanese content
 */
export async function generateJapaneseContent(article, category, styleGuide, sampleArticles = []) {
  try {
    console.log(`🤖 Generating Japanese content for: ${article.title}`);
    
    const prompt = buildPrompt(article, category, styleGuide, sampleArticles);
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a professional technical translator specializing in frontend development and web technologies. You translate English technical articles into natural, accurate Japanese while maintaining the author\'s style and technical precision.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: category === 'MUSTREAD' ? 1000 : category === 'FEATURED' ? 500 : 100,
    });
    
    const result = response.choices[0].message.content.trim();
    
    // Parse the response based on category
    return parseResponse(result, category);
    
  } catch (error) {
    console.error('Error generating Japanese content:', error);
    throw new Error(`Failed to generate Japanese content: ${error.message}`);
  }
}

/**
 * Build the prompt for OpenAI
 * @param {Object} article - Article object
 * @param {string} category - Article category
 * @param {Object} styleGuide - Writing style guide
 * @param {Array} sampleArticles - Sample articles
 * @returns {string} Formatted prompt
 */
function buildPrompt(article, category, styleGuide, sampleArticles) {
  const samples = sampleArticles
    .filter(sample => sample.category === category)
    .slice(0, 2)
    .map(sample => `
English Title: ${sample.title}
Japanese Title: ${sample.japaneseTitle || 'N/A'}
Content: ${sample.content || 'N/A'}
`).join('\n');
  
  const categoryInstructions = {
    MUSTREAD: `
Generate:
1. A Japanese title translation (自然で技術的に正確な日本語タイトル)
2. A detailed Japanese explanation (2-3 paragraphs, ${styleGuide.contentLengths.MUSTREAD.average} characters)

The explanation should:
- Explain the main concepts clearly
- Include technical details when relevant
- Use natural, professional Japanese
- Match the writing style of the examples provided
`,
    FEATURED: `
Generate:
1. A Japanese title translation (自然で技術的に正確な日本語タイトル)
2. A brief Japanese summary (1 paragraph, ${styleGuide.contentLengths.FEATURED.average} characters)

The summary should:
- Provide a concise overview
- Highlight key points
- Use natural, professional Japanese
- Match the writing style of the examples provided
`,
    INBRIEF: `
Generate:
1. A Japanese title translation only (自然で技術的に正確な日本語タイトル)

Keep it concise and accurate.
`
  };
  
  return `
${styleGuide}

## Writing Style Examples (${category}):
${samples}

## Article to Translate:
Title: ${article.title}
Content: ${article.content.substring(0, 2000)}${article.content.length > 2000 ? '...' : ''}

## Instructions:
${categoryInstructions[category]}

## Output Format:
For MUSTREAD and FEATURED:
Title: [Japanese title]
Content: [Japanese explanation]

For INBRIEF:
Title: [Japanese title only]

Please ensure the translation is natural, technically accurate, and matches the style of the examples provided.
`;
}

/**
 * Parse the OpenAI response based on category
 * @param {string} response - OpenAI response
 * @param {string} category - Article category
 * @returns {Object} Parsed content
 */
function parseResponse(response, category) {
  try {
    if (category === 'INBRIEF') {
      // For INBRIEF, just extract the title
      const titleMatch = response.match(/Title:\s*(.+)/);
      return {
        japaneseTitle: titleMatch ? titleMatch[1].trim() : response.trim(),
        japaneseContent: ''
      };
    } else {
      // For MUSTREAD and FEATURED, extract both title and content
      const titleMatch = response.match(/Title:\s*(.+)/);
      const contentMatch = response.match(/Content:\s*([\s\S]+)/);
      
      return {
        japaneseTitle: titleMatch ? titleMatch[1].trim() : '',
        japaneseContent: contentMatch ? contentMatch[1].trim() : response.trim()
      };
    }
  } catch (error) {
    console.warn('Warning: Could not parse response, using raw response');
    return {
      japaneseTitle: category === 'INBRIEF' ? response.trim() : '',
      japaneseContent: category === 'INBRIEF' ? '' : response.trim()
    };
  }
}

/**
 * Generate Japanese content for multiple articles
 * @param {Array} articles - Array of article objects
 * @param {Object} styleGuide - Writing style guide
 * @param {Array} sampleArticles - Sample articles
 * @returns {Promise<Array>} Array of articles with Japanese content
 */
export async function generateMultipleJapaneseContent(articles, styleGuide, sampleArticles = []) {
  const results = [];
  
  for (const article of articles) {
    try {
      const japaneseContent = await generateJapaneseContent(
        article, 
        article.category, 
        styleGuide, 
        sampleArticles
      );
      
      results.push({
        ...article,
        japaneseTitle: japaneseContent.japaneseTitle,
        japaneseContent: japaneseContent.japaneseContent
      });
      
      console.log(`✅ Generated Japanese content for: ${article.title}`);
      
    } catch (error) {
      console.error(`❌ Failed to generate Japanese content for ${article.title}:`, error.message);
      results.push({
        ...article,
        japaneseTitle: '',
        japaneseContent: '',
        error: error.message
      });
    }
  }
  
  return results;
}

/**
 * Validate OpenAI API key and connection
 * @returns {Promise<boolean>} Whether the API is working
 */
export async function validateOpenAI() {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Hello' }],
      max_tokens: 10,
    });
    
    return response.choices[0].message.content.length > 0;
  } catch (error) {
    console.error('OpenAI API validation failed:', error.message);
    return false;
  }
}

/**
 * Estimate API cost for processing articles
 * @param {Array} articles - Array of articles
 * @returns {Object} Cost estimation
 */
export function estimateCost(articles) {
  const modelCosts = {
    'gpt-4o-mini': {
      input: 0.00015, // per 1K tokens
      output: 0.0006  // per 1K tokens
    }
  };
  
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  
  for (const article of articles) {
    // Estimate input tokens (prompt + article content)
    const promptLength = 2000; // Approximate prompt length
    const contentLength = article.content.length;
    const inputTokens = Math.ceil((promptLength + contentLength) / 4); // Rough estimate
    
    // Estimate output tokens based on category
    let outputTokens;
    switch (article.category) {
      case 'MUSTREAD':
        outputTokens = 300; // 2-3 paragraphs
        break;
      case 'FEATURED':
        outputTokens = 150; // 1 paragraph
        break;
      case 'INBRIEF':
        outputTokens = 50;  // Title only
        break;
      default:
        outputTokens = 100;
    }
    
    totalInputTokens += inputTokens;
    totalOutputTokens += outputTokens;
  }
  
  const inputCost = (totalInputTokens / 1000) * modelCosts['gpt-4o-mini'].input;
  const outputCost = (totalOutputTokens / 1000) * modelCosts['gpt-4o-mini'].output;
  const totalCost = inputCost + outputCost;
  
  return {
    totalInputTokens,
    totalOutputTokens,
    estimatedCost: totalCost,
    costPerArticle: articles.length > 0 ? totalCost / articles.length : 0
  };
}

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  // Test the OpenAI connection
  validateOpenAI()
    .then(isValid => {
      if (isValid) {
        console.log('✅ OpenAI API is working correctly');
      } else {
        console.log('❌ OpenAI API validation failed');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Error testing OpenAI API:', error);
      process.exit(1);
    });
} 