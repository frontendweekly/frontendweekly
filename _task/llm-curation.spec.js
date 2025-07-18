import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

// Mock external dependencies
vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
	create: vi.fn()
      }
    }
  }))
}));

vi.mock('playwright', () => ({
  chromium: {
    launch: vi.fn().mockResolvedValue({
      newPage: vi.fn().mockResolvedValue({
	goto: vi.fn().mockResolvedValue(),
	evaluate: vi.fn().mockResolvedValue('Mock article content')
      }),
      close: vi.fn().mockResolvedValue()
    })
  }
}));

vi.mock('@dotenvx/dotenvx', () => ({
  default: {
    config: vi.fn()
  }
}));

vi.mock('node:fs', () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn()
}));

vi.mock('fast-glob', () => ({
  default: {
    sync: vi.fn()
  }
}));

vi.mock('zx', () => ({
  $: vi.fn()
}));

// Mock environment variables
process.env.OPENAI_API_KEY = 'test-api-key';
process.env.TRELLO_API_TOKEN_KEY = 'test-trello-key';
process.env.TRELLO_API_TOKEN_SECRET = 'test-trello-secret';
process.env.TRELLO_FE_WEEKLY_LIST = 'test-list-id';

// Import the module after mocking
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mock the module functions
const mockModule = {
  getNextVol: vi.fn(),
  getNextWednesday: vi.fn(),
  getCards: vi.fn(),
  transformResponse: vi.fn(),
  extractURL: vi.fn(),
  extractArticleContent: vi.fn(),
  analyzeWritingStyle: vi.fn(),
  generateJapaneseContent: vi.fn(),
  generateMustread: vi.fn(),
  generateFeatured: vi.fn(),
  generateInBriefHeading: vi.fn(),
  generateInbrief: vi.fn(),
  generateContent: vi.fn(),
  promptUser: vi.fn(),
  saveContent: vi.fn(),
  main: vi.fn()
};

// Mock the actual module
vi.doMock('./llm-curation.mjs', () => mockModule);

describe('LLM Enhanced Curation Script', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('extractArticleContent', () => {
    it('should extract content from a URL using Playwright', async () => {
      const { extractArticleContent } = await import('./llm-curation.mjs');

      const url = 'https://example.com/article';
      const result = await extractArticleContent(url);

      expect(result).toBe('Mock article content');
    });

    it('should handle Playwright errors gracefully', async () => {
      const { chromium } = await import('playwright');
      chromium.launch.mockRejectedValueOnce(new Error('Browser launch failed'));

      const { extractArticleContent } = await import('./llm-curation.mjs');

      await expect(extractArticleContent('https://example.com')).rejects.toThrow('Browser launch failed');
    });
  });

  describe('analyzeWritingStyle', () => {
    it('should analyze writing style from existing posts', async () => {
      const mockPosts = ['post1.md', 'post2.md'];
      const mockContent = 'Sample post content';

      const fg = await import('fast-glob');
      fg.default.sync.mockReturnValue(mockPosts);

      readFileSync.mockReturnValue(mockContent);

      const openai = (await import('openai')).default;
      openai.mockImplementation(() => ({
	chat: {
	  completions: {
	    create: vi.fn().mockResolvedValue({
	      choices: [{ message: { content: 'Professional, technical Japanese style' } }]
	    })
	  }
	}
      }));

      const { analyzeWritingStyle } = await import('./llm-curation.mjs');
      const result = await analyzeWritingStyle();

      expect(result).toBe('Professional, technical Japanese style');
    });

    it('should return default style when analysis fails', async () => {
      const fg = await import('fast-glob');
      fg.default.sync.mockImplementation(() => {
	throw new Error('File system error');
      });

      const { analyzeWritingStyle } = await import('./llm-curation.mjs');
      const result = await analyzeWritingStyle();

      expect(result).toBe('Professional, concise Japanese translations with technical accuracy');
    });
  });

  describe('generateJapaneseContent', () => {
    it('should generate Japanese content for MUSTREAD section', async () => {
      const mockResponse = {
	choices: [{
	  message: {
	    content: JSON.stringify({
	      translatedTitle: 'テストタイトル',
	      excerpt: 'テストエクセプト'
	    })
	  }
	}]
      };

      const openai = (await import('openai')).default;
      openai.mockImplementation(() => ({
	chat: {
	  completions: {
	    create: vi.fn().mockResolvedValue(mockResponse)
	  }
	}
      }));

      const { generateJapaneseContent } = await import('./llm-curation.mjs');
      const result = await generateJapaneseContent(
	'Test Title',
	'https://example.com',
	'Test content',
	'Professional style',
	'MUSTREAD'
      );

      expect(result).toEqual({
	translatedTitle: 'テストタイトル',
	excerpt: 'テストエクセプト'
      });
    });

    it('should handle OpenAI API errors gracefully', async () => {
      const openai = (await import('openai')).default;
      openai.mockImplementation(() => ({
	chat: {
	  completions: {
	    create: vi.fn().mockRejectedValue(new Error('API Error'))
	  }
	}
      }));

      const { generateJapaneseContent } = await import('./llm-curation.mjs');
      const result = await generateJapaneseContent(
	'Test Title',
	'https://example.com',
	'Test content',
	'Professional style',
	'MUSTREAD'
      );

      expect(result).toEqual({
	translatedTitle: '[翻訳エラー] Test Title',
	excerpt: 'コンテンツの生成中にエラーが発生しました。'
      });
    });
  });

  describe('generateMustread', () => {
    it('should generate MUSTREAD section with Japanese content', async () => {
      const mockData = [
	{
	  title: 'Test Article',
	  desc: 'https://example.com/article',
	  label: 'MUSTREAD'
	}
      ];

      const { extractURL, extractArticleContent, generateJapaneseContent } = await import('./llm-curation.mjs');

      extractURL.mockReturnValue('https://example.com/article');
      extractArticleContent.mockResolvedValue('Mock content');
      generateJapaneseContent.mockResolvedValue({
	translatedTitle: 'テスト記事',
	excerpt: 'テストエクセプト'
      });

      const { generateMustread } = await import('./llm-curation.mjs');
      const result = await generateMustread(mockData, 'Professional style');

      expect(result).toContain('## [Test Article](https://example.com/article)');
      expect(result).toContain('#### テスト記事');
      expect(result).toContain('テストエクセプト');
    });

    it('should handle errors for individual items gracefully', async () => {
      const mockData = [
	{
	  title: 'Test Article',
	  desc: 'https://example.com/article',
	  label: 'MUSTREAD'
	}
      ];

      const { extractURL, extractArticleContent } = await import('./llm-curation.mjs');

      extractURL.mockReturnValue('https://example.com/article');
      extractArticleContent.mockRejectedValue(new Error('Content extraction failed'));

      const { generateMustread } = await import('./llm-curation.mjs');
      const result = await generateMustread(mockData, 'Professional style');

      expect(result).toContain('## [Test Article](https://example.com/article)');
      expect(result).toContain('#### [翻訳エラー]');
      expect(result).toContain('コンテンツの処理中にエラーが発生しました。');
    });
  });

  describe('generateFeatured', () => {
    it('should generate FEATURED section with Japanese content', async () => {
      const mockData = [
	{
	  title: 'Featured Article',
	  desc: 'https://example.com/featured',
	  label: 'FEATURED'
	}
      ];

      const { extractURL, extractArticleContent, generateJapaneseContent } = await import('./llm-curation.mjs');

      extractURL.mockReturnValue('https://example.com/featured');
      extractArticleContent.mockResolvedValue('Mock content');
      generateJapaneseContent.mockResolvedValue({
	translatedTitle: '注目記事',
	excerpt: '注目エクセプト'
      });

      const { generateFeatured } = await import('./llm-curation.mjs');
      const result = await generateFeatured(mockData, 'Professional style');

      expect(result).toContain('## [Featured Article](https://example.com/featured)');
      expect(result).toContain('注目エクセプト');
    });
  });

  describe('generateInbrief', () => {
    it('should generate INBRIEF section with Japanese content', async () => {
      const mockData = [
	{
	  title: 'Brief Article',
	  desc: 'https://example.com/brief',
	  label: 'INBRIEF'
	}
      ];

      const { extractURL, extractArticleContent, generateJapaneseContent } = await import('./llm-curation.mjs');

      extractURL.mockReturnValue('https://example.com/brief');
      extractArticleContent.mockResolvedValue('Mock content');
      generateJapaneseContent.mockResolvedValue({
	translatedTitle: '簡潔記事',
	excerpt: '簡潔エクセプト'
      });

      const { generateInbrief } = await import('./llm-curation.mjs');
      const result = await generateInbrief(mockData, 'Professional style');

      expect(result).toContain('- **[Brief Article](https://example.com/brief)**: 簡潔記事');
    });
  });

  describe('generateContent', () => {
    it('should generate complete content with all sections', async () => {
      const mockData = [
	{ title: 'Must Read', desc: 'https://example.com/must', label: 'MUSTREAD' },
	{ title: 'Featured', desc: 'https://example.com/featured', label: 'FEATURED' },
	{ title: 'Brief', desc: 'https://example.com/brief', label: 'INBRIEF' }
      ];

      const { analyzeWritingStyle, generateMustread, generateFeatured, generateInbrief } = await import('./llm-curation.mjs');

      analyzeWritingStyle.mockResolvedValue('Professional style');
      generateMustread.mockResolvedValue('## Must Read Content');
      generateFeatured.mockResolvedValue('## Featured Content');
      generateInbrief.mockResolvedValue('- Brief Content');

      const { generateContent } = await import('./llm-curation.mjs');
      const result = await generateContent(mockData, { title: 500, date: '2024-01-01' });

      expect(result).toContain('## Must Read Content');
      expect(result).toContain('## Featured Content');
      expect(result).toContain('## In Brief');
      expect(result).toContain('- Brief Content');
      expect(result).toContain('title: Vol.500');
      expect(result).toContain('date: 2024-01-01');
    });
  });

  describe('main function', () => {
    it('should validate OpenAI API key', async () => {
      delete process.env.OPENAI_API_KEY;

      const { main } = await import('./llm-curation.mjs');

      await expect(main()).rejects.toThrow('OPENAI_API_KEY environment variable is required');
    });

    it('should handle errors gracefully', async () => {
      process.env.OPENAI_API_KEY = 'test-key';

      const { getCards } = await import('./llm-curation.mjs');
      getCards.mockRejectedValue(new Error('Trello API failed'));

      const { main } = await import('./llm-curation.mjs');

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {});

      await main();

      expect(consoleSpy).toHaveBeenCalledWith('❌ Error:', 'Trello API failed');
      expect(exitSpy).toHaveBeenCalledWith(1);

      consoleSpy.mockRestore();
      exitSpy.mockRestore();
    });
  });

  describe('Integration tests', () => {
    it('should process a complete workflow', async () => {
      const mockCards = [
	{
	  id: '1',
	  name: 'Test Article',
	  desc: 'https://example.com/test',
	  labels: [{ name: 'MUSTREAD' }]
	}
      ];

      const mockTransformedData = [
	{
	  id: '1',
	  title: 'Test Article',
	  desc: 'https://example.com/test',
	  label: 'MUSTREAD'
	}
      ];

      const { getCards, transformResponse, promptUser, generateContent, saveContent } = await import('./llm-curation.mjs');

      getCards.mockResolvedValue(mockCards);
      transformResponse.mockResolvedValue(mockTransformedData);
      promptUser.mockResolvedValue({ title: 500, date: '2024-01-01' });
      generateContent.mockResolvedValue('Generated content');
      saveContent.mockReturnValue('/path/to/post.md');

      const { main } = await import('./llm-curation.mjs');

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await main();

      expect(getCards).toHaveBeenCalled();
      expect(transformResponse).toHaveBeenCalledWith(mockCards);
      expect(promptUser).toHaveBeenCalled();
      expect(generateContent).toHaveBeenCalledWith(mockTransformedData, { title: 500, date: '2024-01-01' });
      expect(saveContent).toHaveBeenCalledWith('Generated content', { title: 500, date: '2024-01-01' });

      consoleSpy.mockRestore();
    });
  });
});