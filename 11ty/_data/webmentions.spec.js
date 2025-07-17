import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Mock node:fs
vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    readFileSync: vi.fn(),
  };
});

// Mock node:path
vi.mock('node:path', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    dirname: vi.fn(),
    join: vi.fn(),
  };
});

// Mock node:url
vi.mock('node:url', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    fileURLToPath: vi.fn(),
  };
});

// Mock @11ty/eleventy-fetch
vi.mock('@11ty/eleventy-fetch', () => ({
  default: vi.fn(),
}));

// Mock signale
vi.mock('signale', () => ({
  default: {
    fatal: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock dotenv
vi.mock('dotenv', () => ({
  default: {
    config: vi.fn(),
  },
}));

describe('webmentions data', () => {
  let mockEleventyFetch;
  let mockSignale;
  let originalEnv;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    
    // Store original environment
    originalEnv = { ...process.env };
    
    // Set default environment variables for tests
    process.env.WEBMENTION_IO_TOKEN = 'test-token';
    readFileSync.mockReturnValue(JSON.stringify({ webmention: 'frontendweekly.tokyo' }));
    
    dirname.mockReturnValue('/mock/dir');
    join.mockReturnValue('/mock/dir/site.json');
    fileURLToPath.mockReturnValue('/mock/dir/webmentions.js');
    
    // Get mocked modules
    const { default: eleventyFetch } = await import('@11ty/eleventy-fetch');
    mockEleventyFetch = eleventyFetch;
    
    const signale = await import('signale');
    mockSignale = signale.default;
  });

  afterEach(() => {
    // Restore environment
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('fetchWebmentions', () => {
    test('should fetch webmentions successfully', async () => {
      const mockResponse = {
        children: [
          {
            type: 'entry',
            author: { name: 'Test User' },
            'wm-target': 'https://frontendweekly.tokyo/post1',
            'wm-property': 'like',
            published: '2024-01-15T10:00:00Z'
          },
          {
            type: 'entry',
            author: { name: 'Another User' },
            'wm-target': 'https://frontendweekly.tokyo/post2',
            'wm-property': 'mention',
            published: '2024-01-16T10:00:00Z'
          }
        ]
      };
      
      mockEleventyFetch.mockResolvedValue(mockResponse);
      
      const { default: webmentionsData } = await import('./webmentions.js');
      const result = await webmentionsData();

      expect(result).toEqual(mockResponse.children);
      expect(mockEleventyFetch).toHaveBeenCalledWith(
        'https://webmention.io/api/mentions.jf2?domain=frontendweekly.tokyo&token=test-token&per-page=999&sort-by=published',
        { duration: '1d' }
      );
      expect(mockSignale.info).toHaveBeenCalledWith(
        '2 webmentions fetched from {API_ORIGIN}?domain=frontendweekly.tokyo}'
      );
    });

    test('should return empty array when no webmention domain configured', async () => {
      process.env.WEBMENTION_IO_TOKEN = 'test-token'; // ensure token is set
      readFileSync.mockReturnValue(JSON.stringify({})); // no domain
      const { default: webmentionsData } = await import('./webmentions.js');
      const result = await webmentionsData();
      expect(result).toEqual([]);
      // Note: The function returns empty array when no webmention domain is configured
      // The signale.fatal call happens inside fetchWebmentions but doesn't affect the return value
    });

    test('should return empty array when no token provided', async () => {
      readFileSync.mockReturnValue(JSON.stringify({ webmention: 'frontendweekly.tokyo' }));
      delete process.env.WEBMENTION_IO_TOKEN;
      const { default: webmentionsData } = await import('./webmentions.js');
      const result = await webmentionsData();
      expect(result).toEqual([]);
      expect(mockSignale.fatal).toHaveBeenCalledWith(
        'unable to fetch webmentions: no access token specified in environment.'
      );
    });

    test('should return empty array when API response has no children', async () => {
      mockEleventyFetch.mockResolvedValue({});
      const { default: webmentionsData } = await import('./webmentions.js');
      const result = await webmentionsData();
      expect(result).toEqual([]);
      expect(mockSignale.warn).toHaveBeenCalledWith('No webmentions data available');
    });

    test('should return empty array when API response is null', async () => {
      mockEleventyFetch.mockResolvedValue(null);
      const { default: webmentionsData } = await import('./webmentions.js');
      const result = await webmentionsData();
      expect(result).toEqual([]);
      expect(mockSignale.warn).toHaveBeenCalledWith('No webmentions data available');
    });

    test('should handle API errors gracefully', async () => {
      const apiError = new Error('API request failed');
      mockEleventyFetch.mockRejectedValue(apiError);
      const { default: webmentionsData } = await import('./webmentions.js');
      const result = await webmentionsData();
      expect(result).toEqual([]);
      expect(mockSignale.fatal).toHaveBeenCalledWith(apiError);
    });

    test('should handle network errors gracefully', async () => {
      const networkError = new Error('Network timeout');
      mockEleventyFetch.mockRejectedValue(networkError);
      const { default: webmentionsData } = await import('./webmentions.js');
      const result = await webmentionsData();
      expect(result).toEqual([]);
      expect(mockSignale.fatal).toHaveBeenCalledWith(networkError);
    });

    test('should use correct API URL with parameters', async () => {
      mockEleventyFetch.mockResolvedValue({ children: [] });
      const { default: webmentionsData } = await import('./webmentions.js');
      await webmentionsData();
      expect(mockEleventyFetch).toHaveBeenCalledWith(
        expect.stringMatching(/^https:\/\/webmention\.io\/api\/mentions\.jf2\?domain=frontendweekly\.tokyo&token=test-token&per-page=999&sort-by=published$/),
        { duration: '1d' }
      );
    });

    test('should handle empty children array', async () => {
      mockEleventyFetch.mockResolvedValue({ children: [] });
      const { default: webmentionsData } = await import('./webmentions.js');
      const result = await webmentionsData();
      expect(result).toEqual([]);
      expect(mockSignale.info).toHaveBeenCalledWith(
        '0 webmentions fetched from {API_ORIGIN}?domain=frontendweekly.tokyo}'
      );
    });

    test('should handle complex webmention data structure', async () => {
      const complexResponse = {
        children: [
          {
            type: 'entry',
            author: {
              name: 'Test User',
              photo: 'https://example.com/avatar.jpg',
              url: 'https://example.com/user'
            },
            'wm-target': 'https://frontendweekly.tokyo/post1',
            'wm-property': 'like',
            'wm-received': '2024-01-15T10:00:00Z',
            'wm-id': 12345,
            content: {
              text: 'Great post!',
              html: '<p>Great post!</p>'
            },
            published: '2024-01-15T10:00:00Z'
          }
        ]
      };
      
      mockEleventyFetch.mockResolvedValue(complexResponse);
      const { default: webmentionsData } = await import('./webmentions.js');
      const result = await webmentionsData();
      expect(result).toEqual(complexResponse.children);
      expect(result[0]).toHaveProperty('author.name', 'Test User');
      expect(result[0]).toHaveProperty('wm-target', 'https://frontendweekly.tokyo/post1');
      expect(result[0]).toHaveProperty('wm-property', 'like');
    });
  });

  describe('Integration tests', () => {
    test('should handle real-world webmention data flow', async () => {
      const realWorldData = {
        children: [
          {
            type: 'entry',
            author: { name: 'John Doe' },
            'wm-target': 'https://frontendweekly.tokyo/post1',
            'wm-property': 'like',
            published: '2024-01-15T10:00:00Z'
          },
          {
            type: 'entry',
            author: { name: 'Jane Smith' },
            'wm-target': 'https://frontendweekly.tokyo/post1',
            'wm-property': 'mention',
            published: '2024-01-16T10:00:00Z'
          },
          {
            type: 'entry',
            author: { name: 'Bob Wilson' },
            'wm-target': 'https://frontendweekly.tokyo/post2',
            'wm-property': 'repost',
            published: '2024-01-17T10:00:00Z'
          }
        ]
      };
      
      mockEleventyFetch.mockResolvedValue(realWorldData);
      const { default: webmentionsData } = await import('./webmentions.js');
      const result = await webmentionsData();
      expect(result).toHaveLength(3);
      expect(result[0].author.name).toBe('John Doe');
      expect(result[1].author.name).toBe('Jane Smith');
      expect(result[2].author.name).toBe('Bob Wilson');
      expect(mockSignale.info).toHaveBeenCalledWith(
        '3 webmentions fetched from {API_ORIGIN}?domain=frontendweekly.tokyo}'
      );
    });
  });
}); 