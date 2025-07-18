import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import { chromium } from 'playwright';

// Mock playwright
vi.mock('playwright', () => ({
  chromium: {
    launch: vi.fn(),
  },
}));

// Mock global fetch
global.fetch = vi.fn();

// Import the functions we want to test
import {
  extractArticleContent,
  extractMultipleArticles,
  validateUrl,
} from './content-extractor.mjs';

describe('content-extractor', () => {
  let mockBrowser;
  let mockPage;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock browser and page
    mockPage = {
      setUserAgent: vi.fn(),
      goto: vi.fn(),
      evaluate: vi.fn(),
      close: vi.fn(),
    };

    mockBrowser = {
      newPage: vi.fn().mockResolvedValue(mockPage),
      close: vi.fn(),
    };

    chromium.launch.mockResolvedValue(mockBrowser);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('extractArticleContent', () => {
    test('should extract article content successfully', async () => {
      const mockUrl = 'https://example.com/article';
      const mockMetadata = {
	title: 'Test Article',
	author: 'John Doe',
	date: '2025-01-15',
      };
      const mockTitle = 'Test Article';
      const mockContent = 'This is the main content of the article.';

      mockPage.evaluate
	.mockResolvedValueOnce(mockMetadata) // extractMetadata
	.mockResolvedValueOnce(mockTitle)    // extractTitle
	.mockResolvedValueOnce(mockContent); // extractMainContent

      const result = await extractArticleContent(mockUrl);

      expect(result).toEqual({
	url: mockUrl,
	title: mockTitle,
	author: mockMetadata.author,
	date: mockMetadata.date,
	content: mockContent,
	wordCount: 8, // "This is the main content of the article."
	extractedAt: expect.any(String),
      });

      expect(chromium.launch).toHaveBeenCalledWith({
	headless: true,
	args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      expect(mockPage.setUserAgent).toHaveBeenCalled();
      expect(mockPage.goto).toHaveBeenCalledWith(mockUrl, {
	waitUntil: 'networkidle',
	timeout: 30000,
      });
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    test('should handle extraction errors gracefully', async () => {
      const mockUrl = 'https://example.com/error';
      const errorMessage = 'Navigation timeout';

      mockPage.goto.mockRejectedValue(new Error(errorMessage));

      await expect(extractArticleContent(mockUrl)).rejects.toThrow(
	`Failed to extract content from ${mockUrl}: ${errorMessage}`
      );

      expect(mockBrowser.close).toHaveBeenCalled();
    });

    test('should handle metadata extraction errors', async () => {
      const mockUrl = 'https://example.com/article';
      const mockTitle = 'Test Article';
      const mockContent = 'Article content.';

      mockPage.evaluate
	.mockRejectedValueOnce(new Error('Metadata error')) // extractMetadata
	.mockResolvedValueOnce(mockTitle)                   // extractTitle
	.mockResolvedValueOnce(mockContent);                // extractMainContent

      const result = await extractArticleContent(mockUrl);

      expect(result.title).toBe(mockTitle);
      expect(result.author).toBe('');
      expect(result.date).toBe('');
      expect(result.content).toBe(mockContent);
    });

    test('should handle title extraction errors', async () => {
      const mockUrl = 'https://example.com/article';
      const mockMetadata = {
	title: 'Fallback Title',
	author: 'John Doe',
	date: '2025-01-15',
      };
      const mockContent = 'Article content.';

      mockPage.evaluate
	.mockResolvedValueOnce(mockMetadata) // extractMetadata
	.mockRejectedValueOnce(new Error('Title error')) // extractTitle
	.mockResolvedValueOnce(mockContent);             // extractMainContent

      const result = await extractArticleContent(mockUrl);

      expect(result.title).toBe(mockMetadata.title); // Should use metadata title as fallback
      expect(result.content).toBe(mockContent);
    });

    test('should handle content extraction errors', async () => {
      const mockUrl = 'https://example.com/article';
      const mockMetadata = {
	title: 'Test Article',
	author: 'John Doe',
	date: '2025-01-15',
      };
      const mockTitle = 'Test Article';

      mockPage.evaluate
	.mockResolvedValueOnce(mockMetadata) // extractMetadata
	.mockResolvedValueOnce(mockTitle)    // extractTitle
	.mockRejectedValueOnce(new Error('Content error')); // extractMainContent

      await expect(extractArticleContent(mockUrl)).rejects.toThrow(
	'Failed to extract content from'
      );
    });
  });

  describe('extractMultipleArticles', () => {
    test('should extract content from multiple URLs', async () => {
      const urls = [
	'https://example.com/article1',
	'https://example.com/article2',
      ];

      const mockResults = [
	{
	  url: urls[0],
	  title: 'Article 1',
	  author: 'Author 1',
	  date: '2025-01-15',
	  content: 'Content 1',
	  wordCount: 1,
	  extractedAt: '2025-01-15T10:00:00.000Z',
	},
	{
	  url: urls[1],
	  title: 'Article 2',
	  author: 'Author 2',
	  date: '2025-01-16',
	  content: 'Content 2',
	  wordCount: 1,
	  extractedAt: '2025-01-15T10:00:00.000Z',
	},
      ];

      // Mock successful extractions
      mockPage.evaluate
	.mockResolvedValueOnce({ title: 'Article 1', author: 'Author 1', date: '2025-01-15' })
	.mockResolvedValueOnce('Article 1')
	.mockResolvedValueOnce('Content 1')
	.mockResolvedValueOnce({ title: 'Article 2', author: 'Author 2', date: '2025-01-16' })
	.mockResolvedValueOnce('Article 2')
	.mockResolvedValueOnce('Content 2');

      const results = await extractMultipleArticles(urls);

      expect(results).toHaveLength(2);
      expect(results[0].title).toBe('Article 1');
      expect(results[1].title).toBe('Article 2');
    });

    test('should handle partial failures gracefully', async () => {
      const urls = [
	'https://example.com/success',
	'https://example.com/failure',
      ];

      // First article succeeds, second fails
      mockPage.evaluate
	.mockResolvedValueOnce({ title: 'Success', author: 'Author', date: '2025-01-15' })
	.mockResolvedValueOnce('Success')
	.mockResolvedValueOnce('Success content')
	.mockRejectedValueOnce(new Error('Navigation failed')); // Second article fails

      const results = await extractMultipleArticles(urls);

      expect(results).toHaveLength(2);
      expect(results[0].title).toBe('Success');
      expect(results[0].error).toBeUndefined();
      expect(results[1].title).toBe('');
      expect(results[1].error).toBe('Failed to extract content from https://example.com/failure: Navigation failed');
    });

    test('should handle empty URL array', async () => {
      const results = await extractMultipleArticles([]);
      expect(results).toEqual([]);
    });
  });

  describe('validateUrl', () => {
    test('should validate accessible URLs', async () => {
      const mockUrl = 'https://example.com/valid';

      mockPage.evaluate.mockResolvedValue({
	title: 'Valid Page',
	hasContent: true,
      });

      const result = await validateUrl(mockUrl);

      expect(result).toBe(true);
      expect(mockPage.goto).toHaveBeenCalledWith(mockUrl, {
	waitUntil: 'networkidle',
	timeout: 15000,
      });
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    test('should reject URLs without content', async () => {
      const mockUrl = 'https://example.com/empty';

      mockPage.evaluate.mockResolvedValue({
	title: 'Empty Page',
	hasContent: false,
      });

      const result = await validateUrl(mockUrl);

      expect(result).toBe(false);
    });

    test('should reject URLs without title', async () => {
      const mockUrl = 'https://example.com/notitle';

      mockPage.evaluate.mockResolvedValue({
	title: '',
	hasContent: true,
      });

      const result = await validateUrl(mockUrl);

      expect(result).toBe(false);
    });

    test('should handle validation errors gracefully', async () => {
      const mockUrl = 'https://example.com/error';

      mockPage.goto.mockRejectedValue(new Error('Connection failed'));

      const result = await validateUrl(mockUrl);

      expect(result).toBe(false);
      expect(mockBrowser.close).toHaveBeenCalled();
    });
  });

  describe('metadata extraction', () => {
    test('should extract various metadata formats', async () => {
      const mockUrl = 'https://example.com/article';
      const mockTitle = 'Test Article';
      const mockContent = 'Content';

      // Mock different metadata extraction scenarios
      mockPage.evaluate
	.mockResolvedValueOnce({
	  title: 'Test Article',
	  author: 'John Doe',
	  date: '2025-01-15T10:00:00Z',
	})
	.mockResolvedValueOnce(mockTitle)
	.mockResolvedValueOnce(mockContent);

      const result = await extractArticleContent(mockUrl);

      expect(result.author).toBe('John Doe');
      expect(result.date).toBe('2025-01-15T10:00:00Z');
    });

    test('should handle missing metadata gracefully', async () => {
      const mockUrl = 'https://example.com/article';
      const mockTitle = 'Test Article';
      const mockContent = 'Content';

      mockPage.evaluate
	.mockResolvedValueOnce({
	  title: 'Test Article',
	  author: '',
	  date: '',
	})
	.mockResolvedValueOnce(mockTitle)
	.mockResolvedValueOnce(mockContent);

      const result = await extractArticleContent(mockUrl);

      expect(result.author).toBe('');
      expect(result.date).toBe('');
    });
  });

  describe('content extraction', () => {
    test('should clean up extracted content', async () => {
      const mockUrl = 'https://example.com/article';
      const mockMetadata = { title: 'Test', author: '', date: '' };
      const mockTitle = 'Test Article';
      const mockContent = '  This   is   content   with   extra   spaces.  \n\n\nAnd multiple newlines.  ';

      mockPage.evaluate
	.mockResolvedValueOnce(mockMetadata)
	.mockResolvedValueOnce(mockTitle)
	.mockResolvedValueOnce(mockContent);

      const result = await extractArticleContent(mockUrl);

      // Content should be cleaned up
      expect(result.content).toBe('This is content with extra spaces. And multiple newlines.');
      expect(result.wordCount).toBe(8);
    });

    test('should handle very long content', async () => {
      const mockUrl = 'https://example.com/article';
      const mockMetadata = { title: 'Test', author: '', date: '' };
      const mockTitle = 'Test Article';
      const longContent = 'word '.repeat(1000); // 1000 words

      mockPage.evaluate
	.mockResolvedValueOnce(mockMetadata)
	.mockResolvedValueOnce(mockTitle)
	.mockResolvedValueOnce(longContent);

      const result = await extractArticleContent(mockUrl);

      expect(result.wordCount).toBe(1000);
    });
  });
});