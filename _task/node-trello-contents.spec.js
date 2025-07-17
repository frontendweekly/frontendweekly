import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import matter from 'gray-matter';

// Mock zx
vi.mock('zx', () => ({
  $: vi.fn(),
}));

// Mock dotenv
vi.mock('dotenv', () => ({
  default: {
    config: vi.fn(),
  },
}));

// Mock fast-glob
vi.mock('fast-glob', () => ({
  default: {
    sync: vi.fn(),
  },
}));

// Mock fetch
global.fetch = vi.fn();

// Properly mock node:fs for ESM
vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    existsSync: vi.fn(),
  };
});

// Properly mock node:path for ESM
vi.mock('node:path', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    resolve: vi.fn(),
    basename: vi.fn(),
    extname: vi.fn(),
  };
});

// Properly mock node:url for ESM
vi.mock('node:url', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    fileURLToPath: vi.fn(),
  };
});

// Import the functions we want to test
import {
  getNextVol,
  getNextWednesday,
  getCards,
  transformResponse,
  extractURL,
  generateMustread,
  generateFeatured,
  generateInBriefHeading,
  generateInbrief,
  generateContent,
  saveContent,
} from './node-trello-contents.mjs';

describe('node-trello-contents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('extractURL', () => {
    test('should extract URL from description', () => {
      const description = 'Check out this article: https://example.com/article and more text';
      const result = extractURL(description);
      expect(result).toBe('https://example.com/article');
    });

    test('should extract URL with www', () => {
      const description = 'Visit https://www.example.com for more info';
      const result = extractURL(description);
      expect(result).toBe('https://www.example.com');
    });

    test('should throw error when no URL found', () => {
      const description = 'This is just text without any URL';
      expect(() => extractURL(description)).toThrow('No URL found in description');
    });

    test('should handle complex URLs with query parameters', () => {
      const description = 'Article at https://example.com/path?param=value&other=123';
      const result = extractURL(description);
      expect(result).toBe('https://example.com/path?param=value&other=123');
    });
  });

  describe('generateMustread', () => {
    test('should generate MUSTREAD section correctly', () => {
      const mockData = [
        {
          title: 'Test Article 1',
          desc: 'Description with https://example1.com link',
          label: 'MUSTREAD',
        },
        {
          title: 'Test Article 2',
          desc: 'Description with https://example2.com link',
          label: 'FEATURED', // This should be filtered out
        },
        {
          title: 'Test Article 3',
          desc: 'Description with https://example3.com link',
          label: 'MUSTREAD',
        },
      ];

      const result = generateMustread(mockData);
      
      expect(result).toContain('## [Test Article 1](https://example1.com)');
      expect(result).toContain('## [Test Article 3](https://example3.com)');
      expect(result).not.toContain('Test Article 2');
      expect(result).toContain('#### TRANSLATED TITLE');
      expect(result).toContain('FILL ME');
    });

    test('should return empty string when no MUSTREAD items', () => {
      const mockData = [
        {
          title: 'Test Article',
          desc: 'Description with https://example.com link',
          label: 'FEATURED',
        },
      ];

      const result = generateMustread(mockData);
      expect(result).toBe('');
    });
  });

  describe('generateFeatured', () => {
    test('should generate FEATURED section correctly', () => {
      const mockData = [
        {
          title: 'Featured Article 1',
          desc: 'Description with https://example1.com link',
          label: 'FEATURED',
        },
        {
          title: 'Featured Article 2',
          desc: 'Description with https://example2.com link',
          label: 'FEATURED',
        },
      ];

      const result = generateFeatured(mockData);
      
      expect(result).toContain('## [Featured Article 1](https://example1.com)');
      expect(result).toContain('## [Featured Article 2](https://example2.com)');
      expect(result).toContain('FILL ME');
    });
  });

  describe('generateInBriefHeading', () => {
    test('should return correct heading', () => {
      const result = generateInBriefHeading();
      expect(result).toBe('## In Brief');
    });
  });

  describe('generateInbrief', () => {
    test('should generate INBRIEF section correctly', () => {
      const mockData = [
        {
          title: 'Brief Article 1',
          desc: 'Description with https://example1.com link',
          label: 'INBRIEF',
        },
        {
          title: 'Brief Article 2',
          desc: 'Description with https://example2.com link',
          label: 'INBRIEF',
        },
      ];

      const result = generateInbrief(mockData);
      
      expect(result).toContain('- **[Brief Article 1](https://example1.com)**: TRANSLATED TITLE');
      expect(result).toContain('- **[Brief Article 2](https://example2.com)**: TRANSLATED TITLE');
    });
  });

  describe('generateContent', () => {
    test('should generate complete content with frontmatter', () => {
      const mockData = [
        {
          title: 'Test Article',
          desc: 'Description with https://example.com link',
          label: 'MUSTREAD',
        },
      ];

      const options = {
        title: 352,
        date: '2024-01-17',
      };

      const result = generateContent(mockData, options);
      
      // Parse the frontmatter
      const parsed = matter(result);
      
      expect(parsed.data.title).toBe('Vol.352');
      expect(parsed.data.date).toBe('2024-01-17');
      expect(parsed.data.permalink).toBe('/posts/352/');
      expect(parsed.data.desc).toBe('3 OF TRANSLATED TITLE、ほか計1リンク');
      expect(parsed.content).toContain('## [Test Article](https://example.com)');
    });
  });

  describe('Integration tests', () => {
    test('should generate complete post from Trello data', () => {
      const mockTransformedData = [
        {
          id: 'card1',
          title: 'Must Read Article',
          desc: 'Important article at https://example.com/must-read',
          label: 'MUSTREAD',
        },
        {
          id: 'card2',
          title: 'Featured Article',
          desc: 'Featured content at https://example.com/featured',
          label: 'FEATURED',
        },
        {
          id: 'card3',
          title: 'Brief Article',
          desc: 'Quick read at https://example.com/brief',
          label: 'INBRIEF',
        },
      ];

      const options = {
        title: 352,
        date: '2024-01-17',
      };

      const content = generateContent(mockTransformedData, options);
      const parsed = matter(content);

      expect(parsed.data.title).toBe('Vol.352');
      expect(parsed.data.date).toBe('2024-01-17');
      expect(parsed.data.desc).toBe('3 OF TRANSLATED TITLE、ほか計3リンク');
      expect(parsed.content).toContain('## [Must Read Article](https://example.com/must-read)');
      expect(parsed.content).toContain('## [Featured Article](https://example.com/featured)');
      expect(parsed.content).toContain('## In Brief');
      expect(parsed.content).toContain('- **[Brief Article](https://example.com/brief)**: TRANSLATED TITLE');
    });
  });
}); 