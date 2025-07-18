import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import OpenAI from 'openai';

// Mock OpenAI
vi.mock('openai', () => ({
  default: vi.fn(),
}));

// Mock dotenv
vi.mock('@dotenvx/dotenvx', () => ({
  default: {
    config: vi.fn(),
  },
}));

// Import the functions we want to test
import {
  generateJapaneseContent,
  generateMultipleJapaneseContent,
  validateOpenAI,
  estimateCost,
} from './llm-processor.mjs';

describe('llm-processor', () => {
  let mockOpenAI;
  let mockChatCompletions;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock OpenAI client
    mockChatCompletions = {
      create: vi.fn(),
    };

    mockOpenAI = {
      chat: {
	completions: mockChatCompletions,
      },
    };

    OpenAI.mockImplementation(() => mockOpenAI);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateJapaneseContent', () => {
    test('should generate Japanese content for MUSTREAD article', async () => {
      const article = {
	title: 'Test Article',
	content: 'This is a test article about frontend development.',
	category: 'MUSTREAD',
      };

      const styleGuide = {
	contentLengths: {
	  MUSTREAD: { average: 500, min: 300, max: 800 },
	  FEATURED: { average: 200, min: 100, max: 400 },
	  INBRIEF: { average: 50, min: 30, max: 80 },
	},
	technicalTerms: ['フロントエンド', 'デザイン'],
      };

      const sampleArticles = [
	{
	  title: 'Sample Article',
	  japaneseTitle: 'サンプル記事',
	  content: 'Sample content',
	  category: 'MUSTREAD',
	},
      ];

      const mockResponse = {
	choices: [
	  {
	    message: {
	      content: 'Title: テスト記事\nContent: これはフロントエンド開発に関するテスト記事です。詳細な説明を含む2-3段落の内容。',
	    },
	  },
	],
      };

      mockChatCompletions.create.mockResolvedValue(mockResponse);

      const result = await generateJapaneseContent(article, 'MUSTREAD', styleGuide, sampleArticles);

      expect(result).toEqual({
	japaneseTitle: 'テスト記事',
	japaneseContent: 'これはフロントエンド開発に関するテスト記事です。詳細な説明を含む2-3段落の内容。',
      });

      expect(mockChatCompletions.create).toHaveBeenCalledWith({
	model: 'gpt-4o',
	messages: expect.arrayContaining([
	  {
	    role: 'system',
	    content: expect.stringContaining('professional technical translator'),
	  },
	  {
	    role: 'user',
	    content: expect.stringContaining('Test Article'),
	  },
	]),
	temperature: 0.3,
	max_tokens: 1000,
      });
    });

    test('should generate Japanese content for FEATURED article', async () => {
      const article = {
	title: 'Featured Article',
	content: 'This is a featured article.',
	category: 'FEATURED',
      };

      const styleGuide = {
	contentLengths: {
	  MUSTREAD: { average: 500, min: 300, max: 800 },
	  FEATURED: { average: 200, min: 100, max: 400 },
	  INBRIEF: { average: 50, min: 30, max: 80 },
	},
	technicalTerms: ['フロントエンド'],
      };

      const mockResponse = {
	choices: [
	  {
	    message: {
	      content: 'Title: 注目記事\nContent: これは注目記事の概要です。',
	    },
	  },
	],
      };

      mockChatCompletions.create.mockResolvedValue(mockResponse);

      const result = await generateJapaneseContent(article, 'FEATURED', styleGuide);

      expect(result).toEqual({
	japaneseTitle: '注目記事',
	japaneseContent: 'これは注目記事の概要です。',
      });

      expect(mockChatCompletions.create).toHaveBeenCalledWith({
	model: 'gpt-4o',
	messages: expect.any(Array),
	temperature: 0.3,
	max_tokens: 500,
      });
    });

    test('should generate Japanese title for INBRIEF article', async () => {
      const article = {
	title: 'Brief Article',
	content: 'Brief content.',
	category: 'INBRIEF',
      };

      const styleGuide = {
	contentLengths: {
	  MUSTREAD: { average: 500, min: 300, max: 800 },
	  FEATURED: { average: 200, min: 100, max: 400 },
	  INBRIEF: { average: 50, min: 30, max: 80 },
	},
	technicalTerms: ['フロントエンド'],
      };

      const mockResponse = {
	choices: [
	  {
	    message: {
	      content: 'Title: 簡潔記事',
	    },
	  },
	],
      };

      mockChatCompletions.create.mockResolvedValue(mockResponse);

      const result = await generateJapaneseContent(article, 'INBRIEF', styleGuide);

      expect(result).toEqual({
	japaneseTitle: '簡潔記事',
	japaneseContent: '',
      });

      expect(mockChatCompletions.create).toHaveBeenCalledWith({
	model: 'gpt-4o',
	messages: expect.any(Array),
	temperature: 0.3,
	max_tokens: 100,
      });
    });

    test('should handle OpenAI API errors', async () => {
      const article = {
	title: 'Test Article',
	content: 'Test content.',
	category: 'MUSTREAD',
      };

      const styleGuide = {
	contentLengths: {
	  MUSTREAD: { average: 500, min: 300, max: 800 },
	  FEATURED: { average: 200, min: 100, max: 400 },
	  INBRIEF: { average: 50, min: 30, max: 80 },
	},
	technicalTerms: [],
      };

      mockChatCompletions.create.mockRejectedValue(new Error('API rate limit exceeded'));

      await expect(generateJapaneseContent(article, 'MUSTREAD', styleGuide)).rejects.toThrow(
	'Failed to generate Japanese content: API rate limit exceeded'
      );
    });

    test('should handle malformed responses gracefully', async () => {
      const article = {
	title: 'Test Article',
	content: 'Test content.',
	category: 'MUSTREAD',
      };

      const styleGuide = {
	contentLengths: {
	  MUSTREAD: { average: 500, min: 300, max: 800 },
	  FEATURED: { average: 200, min: 100, max: 400 },
	  INBRIEF: { average: 50, min: 30, max: 80 },
	},
	technicalTerms: [],
      };

      const mockResponse = {
	choices: [
	  {
	    message: {
	      content: 'Just some random text without proper format',
	    },
	  },
	],
      };

      mockChatCompletions.create.mockResolvedValue(mockResponse);

      const result = await generateJapaneseContent(article, 'MUSTREAD', styleGuide);

      // Should use the raw response as content when parsing fails
      expect(result.japaneseContent).toBe('Just some random text without proper format');
    });
  });

  describe('generateMultipleJapaneseContent', () => {
    test('should generate content for multiple articles', async () => {
      const articles = [
	{
	  title: 'Article 1',
	  content: 'Content 1',
	  category: 'MUSTREAD',
	},
	{
	  title: 'Article 2',
	  content: 'Content 2',
	  category: 'FEATURED',
	},
      ];

      const styleGuide = {
	contentLengths: {
	  MUSTREAD: { average: 500, min: 300, max: 800 },
	  FEATURED: { average: 200, min: 100, max: 400 },
	  INBRIEF: { average: 50, min: 30, max: 80 },
	},
	technicalTerms: [],
      };

      const mockResponses = [
	{
	  choices: [{ message: { content: 'Title: 記事1\nContent: 内容1' } }],
	},
	{
	  choices: [{ message: { content: 'Title: 記事2\nContent: 内容2' } }],
	},
      ];

      mockChatCompletions.create
	.mockResolvedValueOnce(mockResponses[0])
	.mockResolvedValueOnce(mockResponses[1]);

      const results = await generateMultipleJapaneseContent(articles, styleGuide);

      expect(results).toHaveLength(2);
      expect(results[0].japaneseTitle).toBe('記事1');
      expect(results[0].japaneseContent).toBe('内容1');
      expect(results[1].japaneseTitle).toBe('記事2');
      expect(results[1].japaneseContent).toBe('内容2');
    });

    test('should handle partial failures gracefully', async () => {
      const articles = [
	{
	  title: 'Success Article',
	  content: 'Success content',
	  category: 'MUSTREAD',
	},
	{
	  title: 'Failure Article',
	  content: 'Failure content',
	  category: 'FEATURED',
	},
      ];

      const styleGuide = {
	contentLengths: {
	  MUSTREAD: { average: 500, min: 300, max: 800 },
	  FEATURED: { average: 200, min: 100, max: 400 },
	  INBRIEF: { average: 50, min: 30, max: 80 },
	},
	technicalTerms: [],
      };

      mockChatCompletions.create
	.mockResolvedValueOnce({
	  choices: [{ message: { content: 'Title: 成功記事\nContent: 成功内容' } }],
	})
	.mockRejectedValueOnce(new Error('API error'));

      const results = await generateMultipleJapaneseContent(articles, styleGuide);

      expect(results).toHaveLength(2);
      expect(results[0].japaneseTitle).toBe('成功記事');
      expect(results[0].error).toBeUndefined();
      expect(results[1].japaneseTitle).toBe('');
      expect(results[1].error).toBe('Failed to generate Japanese content: API error');
    });

    test('should handle empty articles array', async () => {
      const results = await generateMultipleJapaneseContent([], {});
      expect(results).toEqual([]);
    });
  });

  describe('validateOpenAI', () => {
    test('should validate successful OpenAI connection', async () => {
      mockChatCompletions.create.mockResolvedValue({
	choices: [{ message: { content: 'Hello' } }],
      });

      const result = await validateOpenAI();

      expect(result).toBe(true);
      expect(mockChatCompletions.create).toHaveBeenCalledWith({
	model: 'gpt-4o',
	messages: [{ role: 'user', content: 'Hello' }],
	max_tokens: 10,
      });
    });

    test('should handle OpenAI validation failure', async () => {
      mockChatCompletions.create.mockRejectedValue(new Error('Invalid API key'));

      const result = await validateOpenAI();

      expect(result).toBe(false);
    });

    test('should handle empty response', async () => {
      mockChatCompletions.create.mockResolvedValue({
	choices: [{ message: { content: '' } }],
      });

      const result = await validateOpenAI();

      expect(result).toBe(false);
    });
  });

  describe('estimateCost', () => {
    test('should estimate costs for different article types', () => {
      const articles = [
	{
	  title: 'MUSTREAD Article',
	  content: 'word '.repeat(100), // 100 words
	  category: 'MUSTREAD',
	},
	{
	  title: 'FEATURED Article',
	  content: 'word '.repeat(50), // 50 words
	  category: 'FEATURED',
	},
	{
	  title: 'INBRIEF Article',
	  content: 'word '.repeat(10), // 10 words
	  category: 'INBRIEF',
	},
      ];

      const result = estimateCost(articles);

      expect(result.totalInputTokens).toBeGreaterThan(0);
      expect(result.totalOutputTokens).toBeGreaterThan(0);
      expect(result.estimatedCost).toBeGreaterThan(0);
      expect(result.costPerArticle).toBeGreaterThan(0);
      expect(result.costPerArticle).toBeLessThan(0.1); // Should be reasonable
    });

    test('should handle empty articles array', () => {
      const result = estimateCost([]);

      expect(result.totalInputTokens).toBe(0);
      expect(result.totalOutputTokens).toBe(0);
      expect(result.estimatedCost).toBe(0);
      expect(result.costPerArticle).toBe(0);
    });

    test('should calculate different costs for different categories', () => {
      const mustreadArticle = {
	title: 'MUSTREAD',
	content: 'word '.repeat(100),
	category: 'MUSTREAD',
      };

      const featuredArticle = {
	title: 'FEATURED',
	content: 'word '.repeat(100),
	category: 'FEATURED',
      };

      const inbriefArticle = {
	title: 'INBRIEF',
	content: 'word '.repeat(100),
	category: 'INBRIEF',
      };

      const mustreadCost = estimateCost([mustreadArticle]);
      const featuredCost = estimateCost([featuredArticle]);
      const inbriefCost = estimateCost([inbriefArticle]);

      // MUSTREAD should cost more than FEATURED, which should cost more than INBRIEF
      expect(mustreadCost.estimatedCost).toBeGreaterThan(featuredCost.estimatedCost);
      expect(featuredCost.estimatedCost).toBeGreaterThan(inbriefCost.estimatedCost);
    });
  });

  describe('prompt building', () => {
    test('should include style guide in prompt', async () => {
      const article = {
	title: 'Test Article',
	content: 'Test content.',
	category: 'MUSTREAD',
      };

      const styleGuide = 'Custom style guide content';
      const sampleArticles = [];

      mockChatCompletions.create.mockResolvedValue({
	choices: [{ message: { content: 'Title: テスト\nContent: 内容' } }],
      });

      await generateJapaneseContent(article, 'MUSTREAD', styleGuide, sampleArticles);

      const call = mockChatCompletions.create.mock.calls[0];
      const userMessage = call[0].messages.find(m => m.role === 'user');

      expect(userMessage.content).toContain('Custom style guide content');
    });

    test('should include sample articles in prompt', async () => {
      const article = {
	title: 'Test Article',
	content: 'Test content.',
	category: 'MUSTREAD',
      };

      const styleGuide = 'Style guide';
      const sampleArticles = [
	{
	  title: 'Sample Article',
	  japaneseTitle: 'サンプル記事',
	  content: 'Sample content',
	  category: 'MUSTREAD',
	},
      ];

      mockChatCompletions.create.mockResolvedValue({
	choices: [{ message: { content: 'Title: テスト\nContent: 内容' } }],
      });

      await generateJapaneseContent(article, 'MUSTREAD', styleGuide, sampleArticles);

      const call = mockChatCompletions.create.mock.calls[0];
      const userMessage = call[0].messages.find(m => m.role === 'user');

      expect(userMessage.content).toContain('Sample Article');
      expect(userMessage.content).toContain('サンプル記事');
    });

    test('should truncate long content in prompt', async () => {
      const article = {
	title: 'Test Article',
	content: 'word '.repeat(1000), // Very long content
	category: 'MUSTREAD',
      };

      const styleGuide = 'Style guide';
      const sampleArticles = [];

      mockChatCompletions.create.mockResolvedValue({
	choices: [{ message: { content: 'Title: テスト\nContent: 内容' } }],
      });

      await generateJapaneseContent(article, 'MUSTREAD', styleGuide, sampleArticles);

      const call = mockChatCompletions.create.mock.calls[0];
      const userMessage = call[0].messages.find(m => m.role === 'user');

      // Content should be truncated to 2000 characters
      expect(userMessage.content).toContain('...');
    });
  });
});