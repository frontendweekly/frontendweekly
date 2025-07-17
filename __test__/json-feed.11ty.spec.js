import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies
vi.mock('posthtml', () => ({
  default: vi.fn(),
}));

vi.mock('posthtml-urls', () => ({
  default: vi.fn(),
}));

describe('JSON Feed 11ty', () => {
  let JsonFeed11ty;
  let mockPosthtml;
  let mockPosthtmlUrls;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    
    // Get mocked modules
    mockPosthtml = (await import('posthtml')).default;
    mockPosthtmlUrls = (await import('posthtml-urls')).default;
    
    // Mock posthtml chain
    const mockUse = vi.fn().mockReturnValue({
      process: vi.fn().mockResolvedValue({
        html: '<p>Test content</p>',
      }),
    });
    mockPosthtml.mockReturnValue({
      use: mockUse,
    });
    
    // Mock posthtml-urls
    mockPosthtmlUrls.mockReturnValue({
      eachURL: vi.fn(),
    });
    
          // Import the class
      const module = await import('../11ty/json-feed.11ty.js');
      JsonFeed11ty = module.default;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('data() method', () => {
    test('should return correct data structure', async () => {
      const instance = new JsonFeed11ty();
      const result = await instance.data();

      expect(result).toEqual({
        permalink: '/feed.json',
        eleventyExcludeFromCollections: true,
      });
    });
  });

  describe('prepareContent() method', () => {
    test('should process content with posthtml', async () => {
      const instance = new JsonFeed11ty();
      const content = '<p>Test content with <a href="/relative-link">link</a></p>';
      const baseURL = 'https://example.com';

      const result = await instance.prepareContent(content, baseURL);

      expect(mockPosthtml).toHaveBeenCalled();
      expect(mockPosthtmlUrls).toHaveBeenCalled();
      expect(result).toBe('<p>Test content</p>');
    });

    test('should handle content with newlines', async () => {
      const instance = new JsonFeed11ty();
      const content = '<p>Line 1\nLine 2\nLine 3</p>';
      const baseURL = 'https://example.com';

      const mockProcess = vi.fn().mockResolvedValue({
        html: '<p>Line 1\nLine 2\nLine 3</p>',
      });
      const mockUse = vi.fn().mockReturnValue({
        process: mockProcess,
      });
      mockPosthtml.mockReturnValue({
        use: mockUse,
      });

      const result = await instance.prepareContent(content, baseURL);

      expect(result).toBe('<p>Line 1 Line 2 Line 3</p>');
    });

    test('should handle empty content', async () => {
      const instance = new JsonFeed11ty();
      const content = '';
      const baseURL = 'https://example.com';

      const mockProcess = vi.fn().mockResolvedValue({
        html: '',
      });
      const mockUse = vi.fn().mockReturnValue({
        process: mockProcess,
      });
      mockPosthtml.mockReturnValue({
        use: mockUse,
      });

      const result = await instance.prepareContent(content, baseURL);

      expect(result).toBe('');
    });

    test('should handle posthtml processing errors', async () => {
      const instance = new JsonFeed11ty();
      const content = '<p>Test content</p>';
      const baseURL = 'https://example.com';

      const mockProcess = vi.fn().mockRejectedValue(new Error('Processing error'));
      const mockUse = vi.fn().mockReturnValue({
        process: mockProcess,
      });
      mockPosthtml.mockReturnValue({
        use: mockUse,
      });

      await expect(instance.prepareContent(content, baseURL)).rejects.toThrow('Processing error');
    });
  });

  describe('render() method', () => {
    test('should generate complete JSON feed structure', async () => {
      const instance = new JsonFeed11ty();
      const mockData = {
        site: {
          url: 'https://frontendweekly.tokyo',
          name: 'Frontend Weekly',
          description: 'Weekly frontend news',
          author: {
            name: 'Yuya Saito',
          },
        },
        collections: {
          posts: [
            {
              url: '/posts/2024-01-01-test-post',
              data: {
                title: 'Test Post',
                desc: 'Test description',
                date: '2024-01-01',
                author: 'Yuya Saito',
              },
              templateContent: '<p>Test content</p>',
            },
          ],
        },
      };

      const result = await instance.render(mockData);
      const parsedResult = JSON.parse(result);

      expect(parsedResult).toEqual({
        version: 'https://jsonfeed.org/version/1.1',
        user_comment: 'This is a blog feed. You can add this to your feed reader using the following URL: https://frontendweekly.tokyo/feed.json',
        title: 'Frontend Weekly',
        home_page_url: 'https://frontendweekly.tokyo',
        feed_url: 'https://frontendweekly.tokyo/feed.json',
        description: 'Weekly frontend news',
        favicon: 'https://frontendweekly.tokyo/favicon.ico',
        authors: [
          {
            name: 'Yuya Saito',
            url: 'https://frontendweekly.tokyo',
          },
        ],
        items: [
          {
            id: 'https://frontendweekly.tokyo/posts/2024-01-01-test-post',
            url: 'https://frontendweekly.tokyo/posts/2024-01-01-test-post',
            title: 'Test Post',
            summary: 'Test description',
            content_html: '<p>Test content</p>',
            date_published: '2024-01-01',
            authors: [
              {
                name: 'Yuya Saito',
              },
            ],
          },
        ],
      });
    });

    test('should handle multiple posts', async () => {
      const instance = new JsonFeed11ty();
      const mockData = {
        site: {
          url: 'https://frontendweekly.tokyo',
          name: 'Frontend Weekly',
          description: 'Weekly frontend news',
          author: {
            name: 'Yuya Saito',
          },
        },
        collections: {
          posts: [
            {
              url: '/posts/2024-01-01-post-1',
              data: {
                title: 'Post 1',
                desc: 'Description 1',
                date: '2024-01-01',
                author: 'Yuya Saito',
              },
              templateContent: '<p>Content 1</p>',
            },
            {
              url: '/posts/2024-01-02-post-2',
              data: {
                title: 'Post 2',
                desc: 'Description 2',
                date: '2024-01-02',
                author: 'Yuya Saito',
              },
              templateContent: '<p>Content 2</p>',
            },
          ],
        },
      };

      const result = await instance.render(mockData);
      const parsedResult = JSON.parse(result);

      expect(parsedResult.items).toHaveLength(2);
      expect(parsedResult.items[0].title).toBe('Post 1');
      expect(parsedResult.items[1].title).toBe('Post 2');
    });

    test('should handle empty posts collection', async () => {
      const instance = new JsonFeed11ty();
      const mockData = {
        site: {
          url: 'https://frontendweekly.tokyo',
          name: 'Frontend Weekly',
          description: 'Weekly frontend news',
          author: {
            name: 'Yuya Saito',
          },
        },
        collections: {
          posts: [],
        },
      };

      const result = await instance.render(mockData);
      const parsedResult = JSON.parse(result);

      expect(parsedResult.items).toEqual([]);
    });

    test('should handle posts with missing optional fields', async () => {
      const instance = new JsonFeed11ty();
      const mockData = {
        site: {
          url: 'https://frontendweekly.tokyo',
          name: 'Frontend Weekly',
          description: 'Weekly frontend news',
          author: {
            name: 'Yuya Saito',
          },
        },
        collections: {
          posts: [
            {
              url: '/posts/2024-01-01-test-post',
              data: {
                title: 'Test Post',
                // Missing desc, date, author
              },
              templateContent: '<p>Test content</p>',
            },
          ],
        },
      };

      const result = await instance.render(mockData);
      const parsedResult = JSON.parse(result);

      expect(parsedResult.items[0]).toEqual({
        id: 'https://frontendweekly.tokyo/posts/2024-01-01-test-post',
        url: 'https://frontendweekly.tokyo/posts/2024-01-01-test-post',
        title: 'Test Post',
        summary: undefined,
        content_html: '<p>Test content</p>',
        date_published: undefined,
        authors: [
          {
            name: 'undefined',
          },
        ],
      });
    });

    test('should handle posts with different authors', async () => {
      const instance = new JsonFeed11ty();
      const mockData = {
        site: {
          url: 'https://frontendweekly.tokyo',
          name: 'Frontend Weekly',
          description: 'Weekly frontend news',
          author: {
            name: 'Yuya Saito',
          },
        },
        collections: {
          posts: [
            {
              url: '/posts/2024-01-01-post-1',
              data: {
                title: 'Post 1',
                desc: 'Description 1',
                date: '2024-01-01',
                author: 'Author 1',
              },
              templateContent: '<p>Content 1</p>',
            },
            {
              url: '/posts/2024-01-02-post-2',
              data: {
                title: 'Post 2',
                desc: 'Description 2',
                date: '2024-01-02',
                author: 'Author 2',
              },
              templateContent: '<p>Content 2</p>',
            },
          ],
        },
      };

      const result = await instance.render(mockData);
      const parsedResult = JSON.parse(result);

      expect(parsedResult.items[0].authors[0].name).toBe('Author 1');
      expect(parsedResult.items[1].authors[0].name).toBe('Author 2');
    });

    test('should generate valid JSON string', async () => {
      const instance = new JsonFeed11ty();
      const mockData = {
        site: {
          url: 'https://frontendweekly.tokyo',
          name: 'Frontend Weekly',
          description: 'Weekly frontend news',
          author: {
            name: 'Yuya Saito',
          },
        },
        collections: {
          posts: [
            {
              url: '/posts/2024-01-01-test-post',
              data: {
                title: 'Test Post',
                desc: 'Test description',
                date: '2024-01-01',
                author: 'Yuya Saito',
              },
              templateContent: '<p>Test content</p>',
            },
          ],
        },
      };

      const result = await instance.render(mockData);

      // Should be valid JSON
      expect(() => JSON.parse(result)).not.toThrow();
      
      // Should be formatted with 2 spaces
      expect(result).toContain('  "version"');
      expect(result).toContain('    "id"');
    });
  });

  describe('integration', () => {
    test('should work end-to-end with realistic data', async () => {
      const instance = new JsonFeed11ty();
      
      const mockData = {
        site: {
          url: 'https://frontendweekly.tokyo',
          name: 'Frontend Weekly',
          description: 'Weekly frontend news and updates',
          author: {
            name: 'Yuya Saito',
          },
        },
        collections: {
          posts: [
            {
              url: '/posts/2024-01-01-react-18-features',
              data: {
                title: 'React 18 New Features',
                desc: 'Overview of React 18 new features and improvements',
                date: '2024-01-01T00:00:00.000Z',
                author: 'Yuya Saito',
              },
              templateContent: `
                <h1>React 18 New Features</h1>
                <p>React 18 introduces several new features...</p>
                <a href="/posts/react-17">Previous version</a>
              `,
            },
            {
              url: '/posts/2024-01-08-vue-3-composition',
              data: {
                title: 'Vue 3 Composition API',
                desc: 'Deep dive into Vue 3 Composition API',
                date: '2024-01-08T00:00:00.000Z',
                author: 'Yuya Saito',
              },
              templateContent: `
                <h1>Vue 3 Composition API</h1>
                <p>The Composition API provides a new way to organize component logic...</p>
                <a href="https://vuejs.org">Vue.js official site</a>
              `,
            },
          ],
        },
      };

      // Test data() method
      const data = await instance.data();
      expect(data.permalink).toBe('/feed.json');

      // Test render() method
      const result = await instance.render(mockData);
      const parsedResult = JSON.parse(result);

      expect(parsedResult.version).toBe('https://jsonfeed.org/version/1.1');
      expect(parsedResult.title).toBe('Frontend Weekly');
      expect(parsedResult.items).toHaveLength(2);
      expect(parsedResult.items[0].title).toBe('React 18 New Features');
      expect(parsedResult.items[1].title).toBe('Vue 3 Composition API');
    });
  });
}); 