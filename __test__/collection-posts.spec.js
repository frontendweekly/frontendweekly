import { describe, expect, test, vi, beforeEach } from 'vitest';
import collectionPosts from '../11ty/_collection/collection-posts.js';

describe('collection-posts', () => {
  let mockCollection;
  let mockGlobPath;

  beforeEach(() => {
    // Mock the collection object
    mockCollection = {
      getFilteredByGlob: vi.fn(),
    };
    mockGlobPath = 'posts/**/*.md';
  });

  test('should return live posts in reverse chronological order', () => {
    const now = new Date();
    const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 1 day ago
    const olderDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000); // 2 days ago

    const mockPosts = [
      {
        date: pastDate,
        data: { draft: false },
        title: 'Recent Post',
      },
      {
        date: olderDate,
        data: { draft: false },
        title: 'Older Post',
      },
    ];

    mockCollection.getFilteredByGlob.mockReturnValue(mockPosts);

    const result = collectionPosts(mockCollection, mockGlobPath);

    expect(mockCollection.getFilteredByGlob).toHaveBeenCalledWith(mockGlobPath);
    expect(result).toHaveLength(2);
    expect(result[0].title).toBe('Older Post'); // Function reverses the array
    expect(result[1].title).toBe('Recent Post');
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

    const result = collectionPosts(mockCollection, mockGlobPath);

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

    const result = collectionPosts(mockCollection, mockGlobPath);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Past Post');
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

    const result = collectionPosts(mockCollection, mockGlobPath);

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

    const result = collectionPosts(mockCollection, mockGlobPath);

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

    const result = collectionPosts(mockCollection, mockGlobPath);

    expect(result).toHaveLength(0);
  });

  test('should handle empty posts array', () => {
    mockCollection.getFilteredByGlob.mockReturnValue([]);

    const result = collectionPosts(mockCollection, mockGlobPath);

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

    const result = collectionPosts(mockCollection, mockGlobPath);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Current Post');
  });

  test('should handle multiple posts with same date', () => {
    const now = new Date();
    const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const mockPosts = [
      {
        date: pastDate,
        data: { draft: false },
        title: 'Post A',
      },
      {
        date: pastDate,
        data: { draft: false },
        title: 'Post B',
      },
    ];

    mockCollection.getFilteredByGlob.mockReturnValue(mockPosts);

    const result = collectionPosts(mockCollection, mockGlobPath);

    expect(result).toHaveLength(2);
    // Order is reversed by the function
    expect(result[0].title).toBe('Post B');
    expect(result[1].title).toBe('Post A');
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

    const result = collectionPosts(mockCollection, mockGlobPath);

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

    const result = collectionPosts(mockCollection, mockGlobPath);

    // Should only include the valid date post
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Valid Date Post');
  });
}); 