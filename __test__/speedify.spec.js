import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Mock dependencies
vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    readFileSync: vi.fn(),
  };
});

vi.mock('node:path', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    dirname: vi.fn(),
    join: vi.fn(),
  };
});

vi.mock('node:url', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    fileURLToPath: vi.fn(),
  };
});

vi.mock('@11ty/eleventy-fetch', () => ({
  default: vi.fn(),
}));

vi.mock('node-fetch', () => ({
  default: vi.fn(),
}));

describe('speedify data', () => {
  let mockEleventyFetch;
  let mockFetch;
  let speedify;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    
    // Setup default mocks
    readFileSync.mockReturnValue(JSON.stringify({ url: 'https://frontendweekly.tokyo' }));
    dirname.mockReturnValue('/mock/dir');
    join.mockReturnValue('/mock/dir/site.json');
    fileURLToPath.mockReturnValue('/mock/dir/speedify.js');
    
    // Get mocked modules
    mockEleventyFetch = (await import('@11ty/eleventy-fetch')).default;
    mockFetch = (await import('node-fetch')).default;
          speedify = (await import('../11ty/_data/speedify.js')).default;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('should return processed speedify data on success', async () => {
    const mockUrlsData = {
      'https://frontendweekly.tokyo/': {
        hash: 'abc123',
      },
    };
    
    const mockScoreData = {
      lighthouse: {
        performance: 0.85,
        accessibility: 0.92,
        bestPractices: 0.88,
        seo: 0.95,
      },
      timestamp: '2024-01-01T00:00:00Z',
    };

    mockEleventyFetch.mockResolvedValue(mockUrlsData);
    mockFetch.mockResolvedValue({
      json: vi.fn().mockResolvedValue(mockScoreData),
    });

    const result = await speedify();

    expect(mockEleventyFetch).toHaveBeenCalledWith(
      'https://speedify.frontendweekly.tokyo/api/urls.json',
      { duration: '1d' }
    );
    expect(mockFetch).toHaveBeenCalledWith('https://speedify.frontendweekly.tokyo/api/abc123.json');
    
    expect(result).toEqual({
      performance: 85,
      accessibility: 92,
      bestPractices: 88,
      seo: 95,
      timestamp: '2024-01-01T00:00:00Z',
    });
  });

  test('should return default values when URL not found in speedify data', async () => {
    const mockUrlsData = {
      'https://othersite.com/': {
        hash: 'xyz789',
      },
    };

    mockEleventyFetch.mockResolvedValue(mockUrlsData);

    const result = await speedify();

    expect(result).toEqual({
      performance: 0,
      accessibility: 0,
      bestPractices: 0,
      seo: 0,
      timestamp: expect.any(String),
    });
  });

  test('should return default values when hash is missing', async () => {
    const mockUrlsData = {
      'https://frontendweekly.tokyo/': {
        // No hash property
      },
    };

    mockEleventyFetch.mockResolvedValue(mockUrlsData);

    const result = await speedify();

    expect(result).toEqual({
      performance: 0,
      accessibility: 0,
      bestPractices: 0,
      seo: 0,
      timestamp: expect.any(String),
    });
  });

  test('should return default values when eleventyFetch fails', async () => {
    mockEleventyFetch.mockRejectedValue(new Error('Network error'));

    const result = await speedify();

    expect(result).toEqual({
      performance: 0,
      accessibility: 0,
      bestPractices: 0,
      seo: 0,
      timestamp: expect.any(String),
    });
  });

  test('should return default values when fetch fails', async () => {
    const mockUrlsData = {
      'https://frontendweekly.tokyo/': {
        hash: 'abc123',
      },
    };

    mockEleventyFetch.mockResolvedValue(mockUrlsData);
    mockFetch.mockRejectedValue(new Error('Fetch error'));

    const result = await speedify();

    expect(result).toEqual({
      performance: 0,
      accessibility: 0,
      bestPractices: 0,
      seo: 0,
      timestamp: expect.any(String),
    });
  });

  test('should return default values when JSON parsing fails', async () => {
    const mockUrlsData = {
      'https://frontendweekly.tokyo/': {
        hash: 'abc123',
      },
    };

    mockEleventyFetch.mockResolvedValue(mockUrlsData);
    mockFetch.mockResolvedValue({
      json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
    });

    const result = await speedify();

    expect(result).toEqual({
      performance: 0,
      accessibility: 0,
      bestPractices: 0,
      seo: 0,
      timestamp: expect.any(String),
    });
  });

  test('should handle decimal scores correctly', async () => {
    const mockUrlsData = {
      'https://frontendweekly.tokyo/': {
        hash: 'abc123',
      },
    };
    
    const mockScoreData = {
      lighthouse: {
        performance: 0.123,
        accessibility: 0.456,
        bestPractices: 0.789,
        seo: 0.999,
      },
      timestamp: '2024-01-01T00:00:00Z',
    };

    mockEleventyFetch.mockResolvedValue(mockUrlsData);
    mockFetch.mockResolvedValue({
      json: vi.fn().mockResolvedValue(mockScoreData),
    });

    const result = await speedify();

    expect(result).toEqual({
      performance: 12,
      accessibility: 45,
      bestPractices: 78,
      seo: 99,
      timestamp: '2024-01-01T00:00:00Z',
    });
  });

  test('should handle zero scores correctly', async () => {
    const mockUrlsData = {
      'https://frontendweekly.tokyo/': {
        hash: 'abc123',
      },
    };
    
    const mockScoreData = {
      lighthouse: {
        performance: 0,
        accessibility: 0,
        bestPractices: 0,
        seo: 0,
      },
      timestamp: '2024-01-01T00:00:00Z',
    };

    mockEleventyFetch.mockResolvedValue(mockUrlsData);
    mockFetch.mockResolvedValue({
      json: vi.fn().mockResolvedValue(mockScoreData),
    });

    const result = await speedify();

    expect(result).toEqual({
      performance: 0,
      accessibility: 0,
      bestPractices: 0,
      seo: 0,
      timestamp: '2024-01-01T00:00:00Z',
    });
  });

  test('should handle missing lighthouse data', async () => {
    const mockUrlsData = {
      'https://frontendweekly.tokyo/': {
        hash: 'abc123',
      },
    };
    
    const mockScoreData = {
      // No lighthouse property
      timestamp: '2024-01-01T00:00:00Z',
    };

    mockEleventyFetch.mockResolvedValue(mockUrlsData);
    mockFetch.mockResolvedValue({
      json: vi.fn().mockResolvedValue(mockScoreData),
    });

    const result = await speedify();

    expect(result).toEqual({
      performance: 0,
      accessibility: 0,
      bestPractices: 0,
      seo: 0,
      timestamp: expect.any(String),
    });
  });

  test('should handle empty speedify data', async () => {
    mockEleventyFetch.mockResolvedValue({});

    const result = await speedify();

    expect(result).toEqual({
      performance: 0,
      accessibility: 0,
      bestPractices: 0,
      seo: 0,
      timestamp: expect.any(String),
    });
  });

  test('should handle null speedify data', async () => {
    mockEleventyFetch.mockResolvedValue(null);

    const result = await speedify();

    expect(result).toEqual({
      performance: 0,
      accessibility: 0,
      bestPractices: 0,
      seo: 0,
      timestamp: expect.any(String),
    });
  });
}); 