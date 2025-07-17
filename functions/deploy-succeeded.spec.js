import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the required modules
vi.mock('node-fetch', () => ({
  default: vi.fn(),
}));

vi.mock('dotenv', () => ({
  default: { config: vi.fn() },
}));

vi.mock('twitter-api-v2', () => {
  return {
    TwitterApi: vi.fn().mockImplementation(() => ({
      v2: {
        search: vi.fn(),
        tweet: vi.fn(),
      },
    })),
  };
});

import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { TwitterApi } from 'twitter-api-v2';
import {
  handler,
  processPosts,
  getTwitterClient,
  publishPost,
} from './deploy-succeeded.js';

describe('deploy-succeeded', () => {
  let mockTwitter;
  let mockFetch;

  beforeEach(() => {
    vi.clearAllMocks();
    // Setup mocks
    mockTwitter = {
      v2: {
        search: vi.fn(),
        tweet: vi.fn(),
      },
    };
    TwitterApi.mockImplementation(() => mockTwitter);
    mockFetch = fetch;
    // Mock environment variables
    process.env.TWITTER_CONSUMER_KEY = 'test-consumer-key';
    process.env.TWITTER_CONSUMER_SECRET = 'test-consumer-secret';
    process.env.TWITTER_ACCESS_TOKEN_KEY = 'test-access-token-key';
    process.env.TWITTER_ACCESS_TOKEN_SECRET = 'test-access-token-secret';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Note: dotenv initialization is not tested as it's a side-effect
  // and ESM mocking makes it difficult to test properly

  describe('getTwitterClient', () => {
    it('should initialize Twitter client with environment variables', () => {
      getTwitterClient();
      expect(TwitterApi).toHaveBeenCalledWith({
        appKey: 'test-consumer-key',
        appSecret: 'test-consumer-secret',
        accessToken: 'test-access-token-key',
        accessSecret: 'test-access-token-secret',
      });
    });
  });

  describe('handler function - success scenarios', () => {
    it('should successfully process posts and publish to Twitter', async () => {
      const mockPosts = {
        title: 'Test Site',
        items: [
          {
            url: 'https://example.com/post1',
            title: 'Test Post',
            summary: 'Test summary',
          },
        ],
      };
      mockFetch.mockResolvedValue({
        json: vi.fn().mockResolvedValue(mockPosts),
      });
      mockTwitter.v2.search.mockResolvedValue({ data: [] });
      mockTwitter.v2.tweet.mockResolvedValue({ data: { id: '123' } });
      const result = await handler();
      expect(result).toEqual({
        statusCode: 200,
        body: 'Post Test Post successfully posted to Twitter.',
      });
      expect(mockFetch).toHaveBeenCalledWith('https://frontendweekly.tokyo/feed.json');
      expect(mockTwitter.v2.search).toHaveBeenCalledWith('https://example.com/post1');
    });
    it('should return 404 when no posts found', async () => {
      const mockPosts = { title: 'Test Site', items: [] };
      mockFetch.mockResolvedValue({ json: vi.fn().mockResolvedValue(mockPosts) });
      const result = await handler();
      expect(result).toEqual({
        statusCode: 404,
        body: 'No posts found to process.',
      });
    });
    it('should return 400 when latest post already syndicated', async () => {
      const mockPosts = {
        title: 'Test Site',
        items: [
          {
            url: 'https://example.com/post1',
            title: 'Test Post',
            summary: 'Test summary',
          },
        ],
      };
      mockFetch.mockResolvedValue({ json: vi.fn().mockResolvedValue(mockPosts) });
      mockTwitter.v2.search.mockResolvedValue({ 
        data: [{ id: '1', text: 'https://example.com/post1' }] 
      });
      const result = await handler();
      expect(result).toEqual({
        statusCode: 400,
        body: 'Latest post was already syndicated. No action taken.',
      });
    });
    it('should handle Twitter search with null data', async () => {
      const mockPosts = {
        title: 'Test Site',
        items: [
          {
            url: 'https://example.com/post1',
            title: 'Test Post',
            summary: 'Test summary',
          },
        ],
      };
      mockFetch.mockResolvedValue({ json: vi.fn().mockResolvedValue(mockPosts) });
      mockTwitter.v2.search.mockResolvedValue({ data: null });
      const result = await handler();
      // Defensive: null data should be treated as unexpected
      expect(result).toEqual({
        statusCode: 422,
        body: 'Unexpected Twitter API response.',
      });
    });
  });

  describe('handler function - error scenarios', () => {
    it('should handle fetch errors', async () => {
      const fetchError = new Error('Fetch failed');
      mockFetch.mockRejectedValue(fetchError);
      const result = await handler();
      expect(result).toEqual({
        statusCode: 422,
        body: 'Fetch failed',
      });
    });
    it('should handle JSON parsing errors', async () => {
      mockFetch.mockResolvedValue({ json: vi.fn().mockRejectedValue(new Error('Invalid JSON')) });
      const result = await handler();
      expect(result).toEqual({
        statusCode: 422,
        body: 'Invalid JSON',
      });
    });
    it('should handle Twitter API errors during search', async () => {
      const mockPosts = {
        title: 'Test Site',
        items: [
          {
            url: 'https://example.com/post1',
            title: 'Test Post',
            summary: 'Test summary',
          },
        ],
      };
      mockFetch.mockResolvedValue({ json: vi.fn().mockResolvedValue(mockPosts) });
      const twitterError = new Error('Twitter API error');
      mockTwitter.v2.search.mockRejectedValue(twitterError);
      const result = await handler();
      expect(result).toEqual({
        statusCode: 422,
        body: 'Twitter API error',
      });
    });
    it('should handle Twitter API errors during posting', async () => {
      const mockPosts = {
        title: 'Test Site',
        items: [
          {
            url: 'https://example.com/post1',
            title: 'Test Post',
            summary: 'Test summary',
          },
        ],
      };
      mockFetch.mockResolvedValue({ json: vi.fn().mockResolvedValue(mockPosts) });
      mockTwitter.v2.search.mockResolvedValue({ data: [] });
      const twitterError = new Error('Twitter posting error');
      mockTwitter.v2.tweet.mockRejectedValue(twitterError);
      const result = await handler();
      expect(result).toEqual({
        statusCode: 422,
        body: 'Twitter posting error',
      });
    });
    it('should handle null response from Twitter post', async () => {
      const mockPosts = {
        title: 'Test Site',
        items: [
          {
            url: 'https://example.com/post1',
            title: 'Test Post',
            summary: 'Test summary',
          },
        ],
      };
      mockFetch.mockResolvedValue({ json: vi.fn().mockResolvedValue(mockPosts) });
      mockTwitter.v2.search.mockResolvedValue({ data: [] });
      mockTwitter.v2.tweet.mockResolvedValue(null);
      const result = await handler();
      expect(result).toEqual({
        statusCode: 422,
        body: 'Error posting to Twitter API.',
      });
    });
  });

  describe('processPosts', () => {
    it('should return 404 when no posts found', async () => {
      const posts = { title: 'Test Site', items: [] };
      const result = await processPosts(posts, mockTwitter);
      expect(result).toEqual({
        statusCode: 404,
        body: 'No posts found to process.',
      });
    });
    it('should publish post when not syndicated', async () => {
      const posts = {
        title: 'Test Site',
        items: [
          {
            url: 'https://example.com/post1',
            title: 'Test Post',
            summary: 'Test summary',
          },
        ],
      };
      mockTwitter.v2.search.mockResolvedValue({ data: [] });
      mockTwitter.v2.tweet.mockResolvedValue({ data: { id: '123' } });
      const result = await processPosts(posts, mockTwitter);
      expect(result).toEqual({
        statusCode: 200,
        body: 'Post Test Post successfully posted to Twitter.',
      });
    });
    it('should return 400 when latest post already syndicated', async () => {
      const posts = {
        title: 'Test Site',
        items: [
          {
            url: 'https://example.com/post1',
            title: 'Test Post',
            summary: 'Test summary',
          },
        ],
      };
      mockTwitter.v2.search.mockResolvedValue({ 
        data: [{ id: '1', text: 'https://example.com/post1' }] 
      });
      const result = await processPosts(posts, mockTwitter);
      expect(result).toEqual({
        statusCode: 400,
        body: 'Latest post was already syndicated. No action taken.',
      });
    });
    it('should handle Twitter API errors', async () => {
      const posts = {
        title: 'Test Site',
        items: [
          {
            url: 'https://example.com/post1',
            title: 'Test Post',
            summary: 'Test summary',
          },
        ],
      };
      const twitterError = new Error('Twitter API error');
      mockTwitter.v2.search.mockRejectedValue(twitterError);
      const result = await processPosts(posts, mockTwitter);
      expect(result).toEqual({
        statusCode: 422,
        body: 'Twitter API error',
      });
    });
    it('should handle unexpected Twitter API response', async () => {
      const posts = {
        title: 'Test Site',
        items: [
          {
            url: 'https://example.com/post1',
            title: 'Test Post',
            summary: 'Test summary',
          },
        ],
      };
      mockTwitter.v2.search.mockResolvedValue({});
      const result = await processPosts(posts, mockTwitter);
      expect(result).toEqual({
        statusCode: 422,
        body: 'Unexpected Twitter API response.',
      });
    });
  });

  describe('publishPost', () => {
    it('should successfully post to Twitter', async () => {
      const siteTitle = 'Test Site';
      const post = {
        title: 'Test Post',
        summary: 'Test summary',
        url: 'https://example.com/post',
      };
      mockTwitter.v2.tweet.mockResolvedValue({ data: { id: '123' } });
      const result = await publishPost(siteTitle, post, mockTwitter);
      expect(result).toEqual({
        statusCode: 200,
        body: 'Post Test Post successfully posted to Twitter.',
      });
      expect(mockTwitter.v2.tweet).toHaveBeenCalledWith('Test summary via Test Site: https://example.com/post');
    });
    it('should handle Twitter API errors', async () => {
      const siteTitle = 'Test Site';
      const post = {
        title: 'Test Post',
        summary: 'Test summary',
        url: 'https://example.com/post',
      };
      const twitterError = new Error('Twitter API error');
      mockTwitter.v2.tweet.mockRejectedValue(twitterError);
      const result = await publishPost(siteTitle, post, mockTwitter);
      expect(result).toEqual({
        statusCode: 422,
        body: 'Twitter API error',
      });
    });
    it('should handle null response from Twitter', async () => {
      const siteTitle = 'Test Site';
      const post = {
        title: 'Test Post',
        summary: 'Test summary',
        url: 'https://example.com/post',
      };
      mockTwitter.v2.tweet.mockResolvedValue(null);
      const result = await publishPost(siteTitle, post, mockTwitter);
      expect(result).toEqual({
        statusCode: 422,
        body: 'Error posting to Twitter API.',
      });
    });
  });
}); 