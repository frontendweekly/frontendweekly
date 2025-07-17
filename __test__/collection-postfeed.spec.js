import { describe, expect, test, vi, beforeEach } from 'vitest';
import collectionPostfeed from '../11ty/_collections/collection-postfeed.js';

describe('collection-postfeed', () => {
  let mockCollection;
  let mockGlobPath;
  let mockMaxPostsPerPage;

  beforeEach(() => {
    // Mock the collection object
    mockCollection = {
      getFilteredByGlob: vi.fn(),
    };
    mockGlobPath = 'posts/**/*.md';
    mockMaxPostsPerPage = 10;
  });

  test('should return live posts in reverse chronological order with limit', () => {
    const now = new Date();
    const pastDate1 = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 1 day ago
    const pastDate2 = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
    const pastDate3 = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000); // 3 days ago

    const mockPosts = [
      {
        date: pastDate1,
        data: { draft: false },
        title: 'Recent Post',
      },
      {
        date: pastDate2,
        data: { draft: false },
        title: 'Older Post',
      },
      {
        date: pastDate3,
        data: { draft: false },
        title: 'Oldest Post',
      },
    ];

    mockCollection.getFilteredByGlob.mockReturnValue(mockPosts);

    const result = collectionPostfeed(mockCollection, mockGlobPath, 2);

    expect(mockCollection.getFilteredByGlob).toHaveBeenCalledWith(mockGlobPath);
    expect(result).toHaveLength(2);
    expect(result[0].title).toBe('Oldest Post'); // Function reverses the array
    expect(result[1].title).toBe('Older Post');
  });

  test('should filter out draft posts', () => {
    const now = new Date();
    const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const mockPosts = [
      {
        date: pastDate,
        data: { draft: false },
        title: 'Live Post',
      },
      {
        date: pastDate,
        data: { draft: true },
        title: 'Draft Post',
      },
    ];

    mockCollection.getFilteredByGlob.mockReturnValue(mockPosts);

    const result = collectionPostfeed(mockCollection, mockGlobPath, 10);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Live Post');
  });

  test('should filter out future posts', () => {
    const now = new Date();
    const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const mockPosts = [
      {
        date: pastDate,
        data: { draft: false },
        title: 'Past Post',
      },
      {
        date: futureDate,
        data: { draft: false },
        title: 'Future Post',
      },
    ];

    mockCollection.getFilteredByGlob.mockReturnValue(mockPosts);

    const result = collectionPostfeed(mockCollection, mockGlobPath, 10);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Past Post');
  });

  test('should limit posts to maxPostsPerPage', () => {
    const now = new Date();
    const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const mockPosts = [
      {
        date: pastDate,
        data: { draft: false },
        title: 'Post 1',
      },
      {
        date: pastDate,
        data: { draft: false },
        title: 'Post 2',
      },
      {
        date: pastDate,
        data: { draft: false },
        title: 'Post 3',
      },
      {
        date: pastDate,
        data: { draft: false },
        title: 'Post 4',
      },
      {
        date: pastDate,
        data: { draft: false },
        title: 'Post 5',
      },
    ];

    mockCollection.getFilteredByGlob.mockReturnValue(mockPosts);

    const result = collectionPostfeed(mockCollection, mockGlobPath, 3);

    expect(result).toHaveLength(3);
    expect(result[0].title).toBe('Post 5');
    expect(result[1].title).toBe('Post 4');
    expect(result[2].title).toBe('Post 3');
  });

  test('should return all posts when maxPostsPerPage is greater than available posts', () => {
    const now = new Date();
    const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const mockPosts = [
      {
        date: pastDate,
        data: { draft: false },
        title: 'Post 1',
      },
      {
        date: pastDate,
        data: { draft: false },
        title: 'Post 2',
      },
    ];

    mockCollection.getFilteredByGlob.mockReturnValue(mockPosts);

    const result = collectionPostfeed(mockCollection, mockGlobPath, 10);

    expect(result).toHaveLength(2);
    expect(result[0].title).toBe('Post 2');
    expect(result[1].title).toBe('Post 1');
  });

  test('should handle posts with no draft property', () => {
    const now = new Date();
    const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const mockPosts = [
      {
        date: pastDate,
        data: {},
        title: 'Post without draft property',
      },
    ];

    mockCollection.getFilteredByGlob.mockReturnValue(mockPosts);

    const result = collectionPostfeed(mockCollection, mockGlobPath, 10);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Post without draft property');
  });

  test('should handle posts with no data property', () => {
    const now = new Date();
    const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const mockPosts = [
      {
        date: pastDate,
        title: 'Post without data property',
      },
    ];

    mockCollection.getFilteredByGlob.mockReturnValue(mockPosts);

    const result = collectionPostfeed(mockCollection, mockGlobPath, 10);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Post without data property');
  });

  test('should return empty array when no posts match criteria', () => {
    const now = new Date();
    const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const mockPosts = [
      {
        date: futureDate,
        data: { draft: false },
        title: 'Future Post',
      },
      {
        date: now,
        data: { draft: true },
        title: 'Draft Post',
      },
    ];

    mockCollection.getFilteredByGlob.mockReturnValue(mockPosts);

    const result = collectionPostfeed(mockCollection, mockGlobPath, 10);

    expect(result).toHaveLength(0);
  });

  test('should handle empty posts array', () => {
    mockCollection.getFilteredByGlob.mockReturnValue([]);

    const result = collectionPostfeed(mockCollection, mockGlobPath, 10);

    expect(result).toHaveLength(0);
  });

  test('should handle posts with exact current date', () => {
    const now = new Date();

    const mockPosts = [
      {
        date: now,
        data: { draft: false },
        title: 'Current Post',
      },
    ];

    mockCollection.getFilteredByGlob.mockReturnValue(mockPosts);

    const result = collectionPostfeed(mockCollection, mockGlobPath, 10);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Current Post');
  });

  test('should handle maxPostsPerPage of 0', () => {
    const now = new Date();
    const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const mockPosts = [
      {
        date: pastDate,
        data: { draft: false },
        title: 'Post 1',
      },
      {
        date: pastDate,
        data: { draft: false },
        title: 'Post 2',
      },
    ];

    mockCollection.getFilteredByGlob.mockReturnValue(mockPosts);

    const result = collectionPostfeed(mockCollection, mockGlobPath, 0);

    expect(result).toHaveLength(0);
  });

  test('should handle maxPostsPerPage of 1', () => {
    const now = new Date();
    const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const mockPosts = [
      {
        date: pastDate,
        data: { draft: false },
        title: 'Post 1',
      },
      {
        date: pastDate,
        data: { draft: false },
        title: 'Post 2',
      },
    ];

    mockCollection.getFilteredByGlob.mockReturnValue(mockPosts);

    const result = collectionPostfeed(mockCollection, mockGlobPath, 1);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Post 2');
  });

  test('should handle negative maxPostsPerPage', () => {
    const now = new Date();
    const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const mockPosts = [
      {
        date: pastDate,
        data: { draft: false },
        title: 'Post 1',
      },
      {
        date: pastDate,
        data: { draft: false },
        title: 'Post 2',
      },
    ];

    mockCollection.getFilteredByGlob.mockReturnValue(mockPosts);

    const result = collectionPostfeed(mockCollection, mockGlobPath, -5);

    expect(result).toHaveLength(0);
  });

  test('should handle undefined maxPostsPerPage', () => {
    const now = new Date();
    const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const mockPosts = [
      {
        date: pastDate,
        data: { draft: false },
        title: 'Post 1',
      },
      {
        date: pastDate,
        data: { draft: false },
        title: 'Post 2',
      },
    ];

    mockCollection.getFilteredByGlob.mockReturnValue(mockPosts);

    const result = collectionPostfeed(mockCollection, mockGlobPath, undefined);

    expect(result).toHaveLength(2);
    expect(result[0].title).toBe('Post 2');
    expect(result[1].title).toBe('Post 1');
  });

  test('should handle posts with string dates', () => {
    const now = new Date();
    const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const mockPosts = [
      {
        date: pastDate.toISOString(),
        data: { draft: false },
        title: 'String Date Post',
      },
    ];

    mockCollection.getFilteredByGlob.mockReturnValue(mockPosts);

    const result = collectionPostfeed(mockCollection, mockGlobPath, 10);

    expect(result).toHaveLength(0); // String dates won't work with <= comparison
  });

  test('should handle posts with invalid dates', () => {
    const now = new Date();
    const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const mockPosts = [
      {
        date: pastDate,
        data: { draft: false },
        title: 'Valid Date Post',
      },
      {
        date: 'invalid-date',
        data: { draft: false },
        title: 'Invalid Date Post',
      },
    ];

    mockCollection.getFilteredByGlob.mockReturnValue(mockPosts);

    const result = collectionPostfeed(mockCollection, mockGlobPath, 10);

    // Should only include the valid date post
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Valid Date Post');
  });

  test('should handle mixed valid and invalid posts with limit', () => {
    const now = new Date();
    const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const mockPosts = [
      {
        date: pastDate,
        data: { draft: false },
        title: 'Valid Post 1',
      },
      {
        date: 'invalid-date',
        data: { draft: false },
        title: 'Invalid Date Post',
      },
      {
        date: pastDate,
        data: { draft: true },
        title: 'Draft Post',
      },
      {
        date: pastDate,
        data: { draft: false },
        title: 'Valid Post 2',
      },
    ];

    mockCollection.getFilteredByGlob.mockReturnValue(mockPosts);

    const result = collectionPostfeed(mockCollection, mockGlobPath, 1);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Valid Post 2');
  });
}); 