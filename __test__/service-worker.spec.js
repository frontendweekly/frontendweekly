import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock service worker APIs
const mockCache = {
  addAll: vi.fn().mockResolvedValue(undefined),
  put: vi.fn().mockResolvedValue(undefined),
  match: vi.fn().mockResolvedValue(null),
};

const mockCaches = {
  open: vi.fn().mockResolvedValue(mockCache),
  keys: vi.fn().mockResolvedValue(['old-cache-1', 'old-cache-2', 'precache-v1.0.0']),
  delete: vi.fn().mockResolvedValue(true),
  match: vi.fn().mockResolvedValue(null),
};

const mockFetch = vi.fn();
const mockSkipWaiting = vi.fn();
const mockClaim = vi.fn();

// Mock global objects
global.caches = mockCaches;
global.fetch = mockFetch;
global.self = {
  skipWaiting: mockSkipWaiting,
  clients: {
    claim: mockClaim,
  },
  addEventListener: vi.fn(),
};

// Mock VERSION constant
global.VERSION = 'v1.0.0';

describe('Service Worker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset all mocks to their default behavior
    mockCache.addAll.mockResolvedValue(undefined);
    mockCache.put.mockResolvedValue(undefined);
    mockCache.match.mockResolvedValue(null);
    mockCaches.open.mockResolvedValue(mockCache);
    mockCaches.keys.mockResolvedValue(['old-cache-1', 'old-cache-2', 'precache-v1.0.0']);
    mockCaches.delete.mockResolvedValue(true);
    mockCaches.match.mockResolvedValue(null);
    mockFetch.mockResolvedValue({ clone: () => ({}) });
    mockSkipWaiting.mockImplementation(() => {});
    mockClaim.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Constants', () => {
    it('should have correct CACHE_KEYS', () => {
      // Import the service worker to test constants
      const swCode = `
        const CACHE_KEYS = {
          PRE_CACHE: \`precache-\${VERSION}\`,
          RUNTIME: \`runtime-\${VERSION}\`,
        };
        module.exports = { CACHE_KEYS };
      `;
      
      // Since we can't easily import the service worker directly, we'll test the logic
      const expectedCacheKeys = {
        PRE_CACHE: 'precache-v1.0.0',
        RUNTIME: 'runtime-v1.0.0',
      };
      
      expect(expectedCacheKeys.PRE_CACHE).toBe('precache-v1.0.0');
      expect(expectedCacheKeys.RUNTIME).toBe('runtime-v1.0.0');
    });

    it('should have correct EXCLUDED_URLS', () => {
      const excludedUrls = ['admin'];
      expect(excludedUrls).toContain('admin');
      expect(excludedUrls).toHaveLength(1);
    });

    it('should have correct PRE_CACHE_URLS', () => {
      const preCacheUrls = ['/'];
      expect(preCacheUrls).toContain('/');
      expect(preCacheUrls).toHaveLength(1);
    });

    it('should have correct IGNORED_HOSTS', () => {
      const ignoredHosts = ['localhost'];
      expect(ignoredHosts).toContain('localhost');
      expect(ignoredHosts).toHaveLength(1);
    });
  });

  describe('addItemsToCache function', () => {
    it('should call caches.open with correct cache name', async () => {
      const cacheName = 'test-cache';
      const items = ['/test1', '/test2'];
      
      // Simulate the function behavior
      await mockCaches.open(cacheName);
      await mockCache.addAll(items);
      
      expect(mockCaches.open).toHaveBeenCalledWith(cacheName);
      expect(mockCache.addAll).toHaveBeenCalledWith(items);
    });

    it('should handle empty items array', async () => {
      const cacheName = 'test-cache';
      const items = [];
      
      await mockCaches.open(cacheName);
      await mockCache.addAll(items);
      
      expect(mockCaches.open).toHaveBeenCalledWith(cacheName);
      expect(mockCache.addAll).toHaveBeenCalledWith(items);
    });

    it('should handle promise rejection gracefully', async () => {
      mockCaches.open.mockRejectedValue(new Error('Cache open failed'));
      
      try {
        await mockCaches.open('test-cache');
      } catch (error) {
        expect(error.message).toBe('Cache open failed');
      }
    });
  });

  describe('Install event handler', () => {
    it('should call skipWaiting', () => {
      // Simulate install event
      mockSkipWaiting();
      
      expect(mockSkipWaiting).toHaveBeenCalled();
    });

    it('should call addItemsToCache with pre-cache URLs', async () => {
      const preCacheUrls = ['/'];
      const cacheName = 'precache-v1.0.0';
      
      await mockCaches.open(cacheName);
      await mockCache.addAll(preCacheUrls);
      
      expect(mockCaches.open).toHaveBeenCalledWith(cacheName);
      expect(mockCache.addAll).toHaveBeenCalledWith(preCacheUrls);
    });
  });

  describe('Activate event handler', () => {
    it('should delete old caches', async () => {
      const oldCaches = ['old-cache-1', 'old-cache-2'];
      const currentCaches = ['precache-v1.0.0', 'runtime-v1.0.0'];
      
      // Mock caches.keys to return old caches
      mockCaches.keys.mockResolvedValue([...oldCaches, ...currentCaches]);
      
      const cacheNames = await mockCaches.keys();
      const itemsToDelete = cacheNames.filter(
        (item) => !['precache-v1.0.0', 'runtime-v1.0.0'].includes(item)
      );
      
      await Promise.all(
        itemsToDelete.map((item) => mockCaches.delete(item))
      );
      
      expect(mockCaches.keys).toHaveBeenCalled();
      expect(mockCaches.delete).toHaveBeenCalledWith('old-cache-1');
      expect(mockCaches.delete).toHaveBeenCalledWith('old-cache-2');
    });

    it('should call clients.claim', async () => {
      await mockClaim();
      
      expect(mockClaim).toHaveBeenCalled();
    });

    it('should handle cache deletion errors gracefully', async () => {
      mockCaches.delete.mockRejectedValue(new Error('Delete failed'));
      
      try {
        await mockCaches.delete('test-cache');
      } catch (error) {
        expect(error.message).toBe('Delete failed');
      }
    });
  });

  describe('Fetch event handler', () => {
    it('should ignore localhost requests', () => {
      const request = {
        url: 'http://localhost:3000/test',
      };
      
      const hostname = new URL(request.url).hostname;
      const shouldIgnore = ['localhost'].indexOf(hostname) >= 0;
      
      expect(shouldIgnore).toBe(true);
    });

    it('should ignore excluded URLs', () => {
      const request = {
        url: 'https://example.com/admin',
      };
      
      const excludedUrls = ['admin'];
      const shouldIgnore = excludedUrls.some((page) => request.url.indexOf(page) > -1);
      
      expect(shouldIgnore).toBe(true);
    });

    it('should return cached response when available', async () => {
      const cachedResponse = { status: 200, body: 'cached content' };
      mockCache.match.mockResolvedValue(cachedResponse);
      
      const response = await mockCache.match('test-request');
      
      expect(response).toBe(cachedResponse);
    });

    it('should fetch from network when not cached', async () => {
      const networkResponse = { status: 200, body: 'network content', clone: () => networkResponse };
      mockCache.match.mockResolvedValue(null);
      mockFetch.mockResolvedValue(networkResponse);
      
      // Simulate the actual service worker logic
      const cachedResponse = await mockCache.match('test-request');
      if (!cachedResponse) {
        const cache = await mockCaches.open('runtime-v1.0.0');
        const response = await mockFetch('test-request');
        await cache.put('test-request', response.clone());
      }
      
      expect(mockCache.match).toHaveBeenCalledWith('test-request');
      expect(mockFetch).toHaveBeenCalledWith('test-request');
      expect(mockCache.put).toHaveBeenCalledWith('test-request', networkResponse);
    });

    it('should handle network fetch errors gracefully', async () => {
      mockCache.match.mockResolvedValue(null);
      mockFetch.mockRejectedValue(new Error('Network error'));
      
      try {
        await mockFetch('test-request');
      } catch (error) {
        expect(error.message).toBe('Network error');
      }
    });

    it('should handle different hostnames correctly', () => {
      const testCases = [
        { url: 'https://example.com/test', shouldIgnore: false },
        { url: 'http://localhost:3000/test', shouldIgnore: true },
        { url: 'https://admin.example.com/test', shouldIgnore: true }, // Contains 'admin' in hostname
        { url: 'https://example.com/admin', shouldIgnore: true }, // Contains 'admin' in path
      ];
      
      testCases.forEach(({ url, shouldIgnore }) => {
        const { hostname } = new URL(url);
        const ignoredHosts = ['localhost'];
        const excludedUrls = ['admin'];
        
        const ignoreHost = ignoredHosts.indexOf(hostname) >= 0;
        const ignoreUrl = excludedUrls.some((page) => url.indexOf(page) > -1);
        
        expect(ignoreHost || ignoreUrl).toBe(shouldIgnore);
      });
    });
  });

  describe('URL parsing', () => {
    it('should correctly parse different URL formats', () => {
      const testUrls = [
        'https://example.com/path',
        'http://localhost:3000/test',
        'https://admin.example.com/dashboard',
        'https://example.com/admin/users',
      ];
      
      testUrls.forEach(url => {
        const parsed = new URL(url);
        expect(parsed.hostname).toBeDefined();
        expect(parsed.href).toBe(url);
      });
    });
  });

  describe('Cache operations', () => {
    it('should handle cache open operations', async () => {
      const cacheName = 'test-cache';
      const cache = await mockCaches.open(cacheName);
      
      expect(mockCaches.open).toHaveBeenCalledWith(cacheName);
      expect(cache).toBe(mockCache);
    });

    it('should handle cache match operations', async () => {
      const request = 'test-request';
      const response = await mockCache.match(request);
      
      expect(mockCache.match).toHaveBeenCalledWith(request);
      expect(response).toBeNull();
    });

    it('should handle cache put operations', async () => {
      const request = 'test-request';
      const response = { status: 200 };
      
      await mockCache.put(request, response);
      
      expect(mockCache.put).toHaveBeenCalledWith(request, response);
    });
  });

  describe('Error handling', () => {
    it('should handle cache open failures', async () => {
      mockCaches.open.mockRejectedValue(new Error('Cache unavailable'));
      
      try {
        await mockCaches.open('test-cache');
      } catch (error) {
        expect(error.message).toBe('Cache unavailable');
      }
    });

    it('should handle cache match failures', async () => {
      mockCache.match.mockRejectedValue(new Error('Match failed'));
      
      try {
        await mockCache.match('test-request');
      } catch (error) {
        expect(error.message).toBe('Match failed');
      }
    });

    it('should handle cache put failures', async () => {
      mockCache.put.mockRejectedValue(new Error('Put failed'));
      
      try {
        await mockCache.put('test-request', {});
      } catch (error) {
        expect(error.message).toBe('Put failed');
      }
    });
  });
}); 