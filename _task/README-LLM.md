# LLM-Powered Frontend Weekly Curation System

This system enhances your existing Frontend Weekly curation workflow by adding AI-powered Japanese content generation to your existing Trello-based workflow.

## Overview

The LLM system builds upon your existing `node-trello-contents.mjs` script to automatically generate Japanese translations and excerpts for your posts using OpenAI's GPT-4.

## Key Features

### 🎯 **Efficient Boilerplate Approach**
- Uses your existing Trello integration and boilerplate generation
- Only adds AI processing for the missing Japanese content
- Maintains the same user experience and file structure
- Drop-in replacement for your current workflow

### 🤖 **AI-Powered Content Generation**
- **Writing Style Analysis**: Learns from your existing posts to match your tone and style
- **Smart Content Extraction**: Uses Playwright to extract article content from URLs
- **Context-Aware Translations**: Generates different content for MUSTREAD, FEATURED, and INBRIEF sections
- **Robust Fallback System**: Automatically falls back to original template when LLM fails
- **Error Handling**: Gracefully handles API failures and content extraction issues

### 📝 **Section-Specific Content**
- **MUSTREAD**: Detailed Japanese excerpts (2-3 sentences) explaining key points
- **FEATURED**: Brief Japanese excerpts (1-2 sentences) summarizing main points  
- **INBRIEF**: Concise Japanese title translations for the brief section

## System Architecture

```
_task/
├── llm-curation.mjs             # Main LLM script (drop-in replacement)
├── style-analyzer.mjs           # Analyzes your writing style from existing posts
├── content-extractor.mjs        # Extracts content from URLs using Playwright
├── llm-processor.mjs            # Handles OpenAI API calls and content generation
├── test-llm-system.mjs          # Tests the system components
└── *.spec.js                    # Unit tests for all modules
```

## Usage

### Prerequisites

1. **Environment Variables** (add to your `.env` file):
```bash
OPENAI_API_KEY=your_openai_api_key_here
TRELLO_API_TOKEN_KEY=your_trello_key
TRELLO_API_TOKEN_SECRET=your_trello_secret
TRELLO_FE_WEEKLY_LIST=your_list_id
```

2. **Dependencies** (already included in package.json):
- `openai`: For GPT-4 API calls
- `playwright`: For web content extraction

### Running the LLM Script

```bash
# Instead of the original script
npm run post:new

# Use the LLM version
npm run post:llm
```

This will:
1. Fetch cards from Trello (same as original script)
2. Transform the data (same as original script)
3. Prompt for volume number and date (same as original script)
4. **NEW**: Analyze your writing style from recent posts
5. **NEW**: Extract content from each article URL
6. **NEW**: Generate Japanese translations and excerpts
7. **NEW**: Fill in the boilerplate with AI-generated content
8. Save the complete post (same as original script)

### Example Output

**Before (Original Script):**
```markdown
## [React 18 New Features](https://example.com/react-18)
#### TRANSLATED TITLE

FILL ME

```

**After (LLM Script):**
```markdown
## [React 18 New Features](https://example.com/react-18)
#### React 18の新機能

React 18では、Concurrent Features、Automatic Batching、Suspense on the Serverなどの重要な新機能が導入されました。これらの機能により、アプリケーションのパフォーマンスとユーザーエクスペリエンスが大幅に向上します。

```

## Configuration

### Environment Variables
```bash
# Required for LLM functionality
OPENAI_API_KEY=your_openai_api_key_here

# Optional: Disable LLM processing entirely
LLM_ENABLED=false

# Required for Trello integration
TRELLO_API_TOKEN_KEY=your_trello_key
TRELLO_API_TOKEN_SECRET=your_trello_secret
TRELLO_FE_WEEKLY_LIST=your_list_id
```

### LLM Configuration
The system includes several configuration options:

```javascript
const LLM_CONFIG = {
  enabled: process.env.LLM_ENABLED !== 'false', // Default: true
  fallbackOnError: true, // Always fallback to template on error
  maxRetries: 2, // Number of retries for LLM operations
};
```

### Writing Style Analysis
The system analyzes your last 5 posts to understand your writing style. You can customize this by modifying the `analyzeWritingStyle()` function.

### Content Extraction
The system uses Playwright to extract content from article URLs. It tries multiple selectors to find the main content:
- `article`
- `[role="main"]`
- `.content`
- `.post-content`
- `.article-content`
- `main`
- `.entry-content`

You can customize the selectors in the `extractArticleContent()` function.

### AI Prompts
The system uses different prompts for different section types. You can customize these in the `generateJapaneseContent()` function.

## Error Handling & Fallback System

The system is designed to be resilient with multiple layers of fallback:

### Automatic Fallback Scenarios
- **LLM Disabled**: If `LLM_ENABLED=false` or no OpenAI API key, uses original template
- **API Failures**: If OpenAI API fails after retries, falls back to template for that item
- **Content Extraction**: If Playwright fails, falls back to template for that item
- **Network Issues**: Timeouts and connection errors trigger fallback
- **Invalid URLs**: URLs that can't be processed use template format

### Fallback Behavior
- **Per-Item Fallback**: Individual items that fail use the original template format
- **Graceful Degradation**: The system continues processing other items even if some fail
- **Transparent Logging**: Clear indication of which items used LLM vs template
- **No Data Loss**: All items are included in the final output regardless of processing method

### Example Fallback Output
```
📊 MUSTREAD processing complete: 2 LLM success, 1 fallback
📊 FEATURED processing complete: 3 LLM success, 0 fallback
📊 INBRIEF processing complete: 5 LLM success, 2 fallback
```

## Cost Estimation

The system uses OpenAI's GPT-4 API. Estimated costs per post:
- **Writing style analysis**: ~$0.01-0.02
- **Content generation**: ~$0.05-0.15 per article (depending on content length)
- **Total per post**: ~$0.20-0.50 (for 10-15 articles)

## Testing

### Run System Tests
```bash
npm run test:llm
```

### Run Unit Tests
```bash
npm run test:task
```

## Migration from Original Script

The LLM script is a drop-in replacement for the original. It maintains the same:
- File structure and naming
- User interaction flow
- Output format
- Error handling patterns

The only difference is that it now includes AI-generated Japanese content instead of placeholders.

## Troubleshooting

### Common Issues

1. **"OPENAI_API_KEY environment variable is required"**
   - Make sure you've added your OpenAI API key to the `.env` file
   - **Note**: The system will automatically fall back to template mode if no API key is provided

2. **"Failed to fetch Trello cards"**
   - Check your Trello API credentials in the `.env` file

3. **"Browser launch failed"**
   - Playwright might need to install browsers: `npx playwright install`
   - **Note**: The system will fall back to template mode for items that can't be extracted

4. **Translation errors**
   - Check your OpenAI API quota and billing
   - Verify the API key is valid
   - **Note**: Individual items that fail will use the template format

5. **LLM processing disabled**
   - Set `LLM_ENABLED=false` in your `.env` file to use template mode only
   - Useful for testing or when you want to avoid API costs

### Debug Mode

To see more detailed logging, you can modify the script to add more console.log statements or use the existing error handling to identify issues.

## Comparison with Original Script

| Feature | Original Script | LLM Script |
|---------|----------------|------------|
| Trello Integration | ✅ | ✅ |
| Boilerplate Generation | ✅ | ✅ |
| User Prompts | ✅ | ✅ |
| Japanese Translations | ❌ | ✅ |
| Japanese Excerpts | ❌ | ✅ |
| Writing Style Learning | ❌ | ✅ |
| Content Extraction | ❌ | ✅ |
| Error Handling | Basic | Comprehensive |
| Fallback System | ❌ | ✅ |
| LLM Disable Option | ❌ | ✅ |

## Future Enhancements

Potential improvements for the LLM system:
- **Caching**: Cache extracted content to avoid re-fetching
- **Batch Processing**: Process multiple articles in parallel
- **Custom Prompts**: Allow users to customize AI prompts
- **Quality Control**: Add validation for generated content
- **Cost Optimization**: Use cheaper models for simple translations 