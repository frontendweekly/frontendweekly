import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import matter from 'gray-matter';

// Mock node:fs
vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    readFileSync: vi.fn(),
    readdirSync: vi.fn(),
  };
});

// Mock node:path
vi.mock('node:path', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    resolve: vi.fn(),
    join: vi.fn(),
  };
});

// Import the functions we want to test
import {
  analyzeWritingStyle,
  generateStyleGuide,
  getSampleArticles,
} from './style-analyzer.mjs';

describe('style-analyzer', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock path resolution
    resolve.mockReturnValue('/mock/posts/dir');
    join.mockImplementation((dir, file) => `${dir}/${file}`);

    // Mock directory listing
    readdirSync.mockReturnValue([
      '2025-07-16-v500.md',
      '2025-07-16-v499.md',
      '2025-07-15-v498.md',
      '2025-07-14-v497.md',
      '2025-07-13-v496.md',
    ]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('extractArticlesFromPost', () => {
    test('should extract MUSTREAD articles correctly', () => {
      const mockContent = `
---
title: Vol.500
date: '2025-07-16'
---

## [Test Article](https://example.com/test)
#### テスト記事

This is the content of the test article.

## [Another Article](https://example.com/another)
#### 別の記事

More content here.
`;

      readFileSync.mockReturnValue(mockContent);

      // We need to test the internal function by calling analyzeWritingStyle
      const result = analyzeWritingStyle(1);

      expect(result.totalArticles).toBeGreaterThan(0);
      expect(result.categories.MUSTREAD).toBeGreaterThan(0);
    });

    test('should extract FEATURED articles correctly', () => {
      const mockContent = `
---
title: Vol.500
date: '2025-07-16'
---

## [Featured Article](https://example.com/featured)

This is a featured article content.

## [Another Featured](https://example.com/another-featured)

More featured content.
`;

      readFileSync.mockReturnValue(mockContent);

      const result = analyzeWritingStyle(1);

      expect(result.categories.FEATURED).toBeGreaterThan(0);
    });

    test('should extract INBRIEF articles correctly', () => {
      const mockContent = `
---
title: Vol.500
date: '2025-07-16'
---

## [Must Read](https://example.com/must)
#### 必読記事

Content here.

## In Brief

- **[Brief Article 1](https://example.com/brief1)**: 簡潔な記事1
- **[Brief Article 2](https://example.com/brief2)**: 簡潔な記事2
`;

      readFileSync.mockReturnValue(mockContent);

      const result = analyzeWritingStyle(1);

      expect(result.categories.INBRIEF).toBeGreaterThan(0);
    });

    test('should handle empty content gracefully', () => {
      const mockContent = `
---
title: Vol.500
date: '2025-07-16'
---

`;

      readFileSync.mockReturnValue(mockContent);

      const result = analyzeWritingStyle(1);

      expect(result.totalArticles).toBe(0);
      expect(result.categories.MUSTREAD).toBe(0);
      expect(result.categories.FEATURED).toBe(0);
      expect(result.categories.INBRIEF).toBe(0);
    });
  });

  describe('analyzeWritingStyle', () => {
    test('should analyze writing style from multiple posts', () => {
      const mockContent1 = `
---
title: Vol.500
---

## [Article 1](https://example.com/1)
#### 記事1

Content with technical terms like フロントエンド and デザイン.

## In Brief

- **[Brief 1](https://example.com/brief1)**: 簡潔な記事1
`;

      const mockContent2 = `
---
title: Vol.499
---

## [Article 2](https://example.com/2)

More content with 技術 and 開発.

## [Article 3](https://example.com/3)
#### 記事3

Even more content with プログラミング.
`;

      readFileSync
	.mockReturnValueOnce(mockContent1)
	.mockReturnValueOnce(mockContent2);

      const result = analyzeWritingStyle(2);

      expect(result.totalArticles).toBeGreaterThan(0);
      expect(result.categories.MUSTREAD).toBeGreaterThan(0);
      expect(result.categories.FEATURED).toBeGreaterThan(0);
      expect(result.categories.INBRIEF).toBeGreaterThan(0);
      expect(result.technicalTerms).toContain('フロントエンド');
      expect(result.technicalTerms).toContain('デザイン');
      expect(result.technicalTerms).toContain('技術');
      expect(result.technicalTerms).toContain('開発');
      expect(result.technicalTerms).toContain('プログラミング');
    });

    test('should calculate content length statistics', () => {
      const mockContent = `
---
title: Vol.500
---

## [Long Article](https://example.com/long)
#### 長い記事

${'This is a very long article content. '.repeat(50)}

## [Short Article](https://example.com/short)

Short content.

## In Brief

- **[Brief](https://example.com/brief)**: 簡潔
`;

      readFileSync.mockReturnValue(mockContent);

      const result = analyzeWritingStyle(1);

      expect(result.contentLengths.MUSTREAD.average).toBeGreaterThan(0);
      expect(result.contentLengths.MUSTREAD.min).toBeGreaterThan(0);
      expect(result.contentLengths.MUSTREAD.max).toBeGreaterThan(0);
      expect(result.contentLengths.FEATURED.average).toBeGreaterThan(0);
    });

    test('should handle errors gracefully', () => {
      readFileSync.mockImplementation(() => {
	throw new Error('File read error');
      });

      expect(() => analyzeWritingStyle(1)).toThrow('File read error');
    });

    test('should limit analysis to specified sample size', () => {
      const mockContent = `
---
title: Vol.500
---

## [Test](https://example.com/test)
#### テスト

Content.
`;

      readFileSync.mockReturnValue(mockContent);

      const result = analyzeWritingStyle(3);

      // Should only analyze 3 posts even though 5 files exist
      expect(readFileSync).toHaveBeenCalledTimes(3);
    });
  });

  describe('generateStyleGuide', () => {
    test('should generate style guide with content length guidelines', () => {
      const mockAnalysis = {
	contentLengths: {
	  MUSTREAD: { average: 500, min: 300, max: 800, count: 5 },
	  FEATURED: { average: 200, min: 100, max: 400, count: 3 },
	  INBRIEF: { average: 50, min: 30, max: 80, count: 10 }
	},
	technicalTerms: ['フロントエンド', 'デザイン', '開発', 'プログラミング']
      };

      const guide = generateStyleGuide(mockAnalysis);

      expect(guide).toContain('MUSTREAD articles: 500 characters average');
      expect(guide).toContain('FEATURED articles: 200 characters average');
      expect(guide).toContain('INBRIEF articles: Japanese title only');
      expect(guide).toContain('- フロントエンド');
      expect(guide).toContain('- デザイン');
      expect(guide).toContain('- 開発');
      expect(guide).toContain('- プログラミング');
    });

    test('should handle missing content length data', () => {
      const mockAnalysis = {
	contentLengths: {
	  MUSTREAD: { average: 0, min: 0, max: 0, count: 0 },
	  FEATURED: { average: 0, min: 0, max: 0, count: 0 },
	  INBRIEF: { average: 0, min: 0, max: 0, count: 0 }
	},
	technicalTerms: []
      };

      const guide = generateStyleGuide(mockAnalysis);

      expect(guide).toContain('MUSTREAD articles: 0 characters average');
      expect(guide).toContain('FEATURED articles: 0 characters average');
    });
  });

  describe('getSampleArticles', () => {
    test('should get sample articles from recent posts', () => {
      const mockContent1 = `
---
title: Vol.500
---

## [Article 1](https://example.com/1)
#### 記事1

Content 1.

## In Brief

- **[Brief 1](https://example.com/brief1)**: 簡潔1
`;

      const mockContent2 = `
---
title: Vol.499
---

## [Article 2](https://example.com/2)

Content 2.

## [Article 3](https://example.com/3)
#### 記事3

Content 3.

## In Brief

- **[Brief 2](https://example.com/brief2)**: 簡潔2
- **[Brief 3](https://example.com/brief3)**: 簡潔3
`;

      readFileSync
	.mockReturnValueOnce(mockContent1)
	.mockReturnValueOnce(mockContent2);

      const samples = getSampleArticles(2);

      expect(samples.length).toBeGreaterThan(0);

      // Should have samples from different categories
      const categories = samples.map(s => s.category);
      expect(categories).toContain('MUSTREAD');
      expect(categories).toContain('FEATURED');
      expect(categories).toContain('INBRIEF');
    });

    test('should limit samples per category', () => {
      const mockContent = `
---
title: Vol.500
---

## [Article 1](https://example.com/1)
#### 記事1

Content.

## [Article 2](https://example.com/2)
#### 記事2

Content.

## In Brief

- **[Brief 1](https://example.com/brief1)**: 簡潔1
- **[Brief 2](https://example.com/brief2)**: 簡潔2
- **[Brief 3](https://example.com/brief3)**: 簡潔3
`;

      readFileSync.mockReturnValue(mockContent);

      const samples = getSampleArticles(1);

      // Should limit to 1 MUSTREAD, 1 FEATURED, 2 INBRIEF per post
      const mustreadCount = samples.filter(s => s.category === 'MUSTREAD').length;
      const featuredCount = samples.filter(s => s.category === 'FEATURED').length;
      const inbriefCount = samples.filter(s => s.category === 'INBRIEF').length;

      expect(mustreadCount).toBeLessThanOrEqual(1);
      expect(featuredCount).toBeLessThanOrEqual(1);
      expect(inbriefCount).toBeLessThanOrEqual(2);
    });

    test('should handle errors gracefully', () => {
      readFileSync.mockImplementation(() => {
	throw new Error('File read error');
      });

      expect(() => getSampleArticles(1)).toThrow('File read error');
    });
  });
});