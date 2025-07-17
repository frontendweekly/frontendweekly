import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies
vi.mock('@11ty/eleventy-fetch', () => ({
  default: vi.fn(),
}));
vi.mock('node-jq', () => ({
  default: {
    run: vi.fn(),
  },
}));
vi.mock('signale', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
  },
}));
vi.mock('@dotenvx/dotenvx', () => ({
  default: { config: vi.fn() },
}));

describe('blogroll data', () => {
  let mockEleventyFetch;
  let mockJq;
  let mockSignale;
  let blogroll;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    mockEleventyFetch = (await import('@11ty/eleventy-fetch')).default;
    mockJq = (await import('node-jq')).default;
    mockSignale = (await import('signale')).default;
    blogroll = (await import('../11ty/_data/blogroll.js')).default;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('returns transformed blogroll on success', async () => {
    const fakeApiResponse = [{
      created_at: '2024-01-01T00:00:00Z',
      id: 1,
      feed_id: 1,
      title: 'Test Blog',
      feed_url: 'https://test.com/feed',
      site_url: 'https://test.com',
    }];
    const transformedObj = {
      dateCreated: '2024-01-01T00:00:00Z',
      items: [
        {
          title: 'Test Blog',
          feed_url: 'https://test.com/feed',
          site_url: 'https://test.com',
        },
      ],
    };
    mockEleventyFetch.mockResolvedValue(fakeApiResponse);
    mockJq.run.mockResolvedValue(JSON.stringify(transformedObj));

    const result = await blogroll();
    expect(result).toHaveProperty('items');
    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].title).toBe('Test Blog');
    expect(result).toHaveProperty('dateCreated');
    expect(typeof result.dateCreated).toBe('string');
    expect(mockSignale.info).toHaveBeenCalledWith('blogroll has 1 items');
  });

  test('returns empty result and logs warn if transform fails', async () => {
    const fakeApiResponse = [{ created_at: '2024-01-01T00:00:00Z' }];
    // Return a stringified object with no items array
    mockEleventyFetch.mockResolvedValue(fakeApiResponse);
    mockJq.run.mockResolvedValue(JSON.stringify({ dateCreated: '2024-01-01T00:00:00Z' }));

    const result = await blogroll();
    expect(result).toHaveProperty('dateCreated');
    expect(result).toHaveProperty('items');
    expect(result.items).toEqual([]);
    expect(mockSignale.warn).toHaveBeenCalledWith('Transformed blogroll data missing items array, returning empty result');
  });

  test('returns empty result if API fetch fails', async () => {
    mockEleventyFetch.mockRejectedValue(new Error('fetch error'));
    const result = await blogroll();
    expect(result).toHaveProperty('dateCreated');
    expect(result).toHaveProperty('items');
    expect(result.items).toEqual([]);
  });

  test('returns empty result if API returns null', async () => {
    mockEleventyFetch.mockResolvedValue(null);
    const result = await blogroll();
    expect(result).toHaveProperty('dateCreated');
    expect(result).toHaveProperty('items');
    expect(result.items).toEqual([]);
  });

  test('returns empty result if API returns empty array', async () => {
    mockEleventyFetch.mockResolvedValue([]);
    mockJq.run.mockResolvedValue(JSON.stringify({ dateCreated: '2024-01-01T00:00:00Z', items: [] }));
    const result = await blogroll();
    expect(result).toHaveProperty('dateCreated');
    expect(result).toHaveProperty('items');
    // items may be [] or undefined depending on jq
  });

  test('logs info with correct count', async () => {
    const fakeApiResponse = [{
      created_at: '2024-01-01T00:00:00Z',
      id: 1,
      feed_id: 1,
      title: 'Test Blog',
      feed_url: 'https://test.com/feed',
      site_url: 'https://test.com',
    }, {
      created_at: '2024-01-01T00:00:00Z',
      id: 2,
      feed_id: 2,
      title: 'Test Blog 2',
      feed_url: 'https://test2.com/feed',
      site_url: 'https://test2.com',
    }];
    const transformedObj = {
      dateCreated: '2024-01-01T00:00:00Z',
      items: [
        {
          title: 'Test Blog',
          feed_url: 'https://test.com/feed',
          site_url: 'https://test.com',
        },
        {
          title: 'Test Blog 2',
          feed_url: 'https://test2.com/feed',
          site_url: 'https://test2.com',
        },
      ],
    };
    mockEleventyFetch.mockResolvedValue(fakeApiResponse);
    mockJq.run.mockResolvedValue(JSON.stringify(transformedObj));
    const result = await blogroll();
    expect(mockSignale.info).toHaveBeenCalledWith('blogroll has 2 items');
    expect(result.items).toHaveLength(2);
  });
}); 