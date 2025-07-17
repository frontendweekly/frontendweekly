import { describe, it, expect } from 'vitest';
import { webmentionData, webmentionProperty } from '../11ty/_filters/webmention.js';

describe('webmention filters', () => {
  const mockMentions = [
    {
      'wm-target': 'https://frontendweekly.tokyo/posts/2021-01-13-v299/',
      'wm-property': 'like-of',
      'wm-id': '123',
      'author': { name: 'John Doe', url: 'https://example.com' },
      'content': { text: 'Great post!' }
    },
    {
      'wm-target': 'https://frontendweekly.tokyo/posts/2021-01-20-v300/',
      'wm-property': 'mention-of',
      'wm-id': '456',
      'author': { name: 'Jane Smith', url: 'https://test.com' },
      'content': { text: 'Interesting article' }
    },
    {
      'wm-target': 'https://frontendweekly.tokyo/posts/2021-01-13-v299/',
      'wm-property': 'reply-of',
      'wm-id': '789',
      'author': { name: 'Bob Wilson', url: 'https://reply.com' },
      'content': { text: 'Thanks for sharing' }
    },
    {
      'wm-target': 'https://frontendweekly.tokyo/posts/2021-01-13-v299/',
      'wm-property': 'like-of',
      'wm-id': '101',
      'author': { name: 'Alice Brown', url: 'https://like.com' },
      'content': null
    }
  ];

  describe('webmentionData', () => {
    it('should filter mentions by target URL', () => {
      const targetUrl = 'https://frontendweekly.tokyo/posts/2021-01-13-v299/';
      const result = webmentionData(mockMentions, targetUrl);
      
      expect(result).toHaveLength(3);
      expect(result.every(mention => mention['wm-target'] === targetUrl)).toBe(true);
    });

    it('should return empty array when no mentions match target URL', () => {
      const targetUrl = 'https://frontendweekly.tokyo/posts/nonexistent/';
      const result = webmentionData(mockMentions, targetUrl);
      
      expect(result).toEqual([]);
    });

    it('should handle empty mentions array', () => {
      const result = webmentionData([], 'https://frontendweekly.tokyo/posts/2021-01-13-v299/');
      
      expect(result).toEqual([]);
    });

    it('should handle null/undefined mentions', () => {
      expect(() => webmentionData(null, 'https://frontendweekly.tokyo/posts/2021-01-13-v299/')).toThrow();
      expect(() => webmentionData(undefined, 'https://frontendweekly.tokyo/posts/2021-01-13-v299/')).toThrow();
    });

    it('should handle mentions without wm-target property', () => {
      const mentionsWithMissingTarget = [
        { 'wm-property': 'like-of', 'wm-id': '123' },
        { 'wm-target': 'https://frontendweekly.tokyo/posts/2021-01-13-v299/', 'wm-property': 'like-of', 'wm-id': '456' }
      ];
      
      const result = webmentionData(mentionsWithMissingTarget, 'https://frontendweekly.tokyo/posts/2021-01-13-v299/');
      
      expect(result).toHaveLength(1);
      expect(result[0]['wm-id']).toBe('456');
    });

    it('should be case sensitive when matching URLs', () => {
      const targetUrl = 'https://frontendweekly.tokyo/posts/2021-01-13-v299/';
      const caseSensitiveUrl = 'https://FRONTENDWEEKLY.TOKYO/posts/2021-01-13-v299/';
      
      const result = webmentionData(mockMentions, caseSensitiveUrl);
      
      expect(result).toEqual([]);
    });
  });

  describe('webmentionProperty', () => {
    it('should extract specific property values for matching mentions', () => {
      const targetUrl = 'https://frontendweekly.tokyo/posts/2021-01-13-v299/';
      const result = webmentionProperty(mockMentions, targetUrl, 'wm-property');
      
      expect(result).toEqual(['like-of', 'reply-of', 'like-of']);
    });

    it('should filter out falsy property values', () => {
      const targetUrl = 'https://frontendweekly.tokyo/posts/2021-01-13-v299/';
      const result = webmentionProperty(mockMentions, targetUrl, 'content');
      
      expect(result).toHaveLength(2); // Only 2 mentions have non-null content
      expect(result.every(content => content !== null && content !== undefined)).toBe(true);
    });

    it('should return empty array when no mentions match target URL', () => {
      const targetUrl = 'https://frontendweekly.tokyo/posts/nonexistent/';
      const result = webmentionProperty(mockMentions, targetUrl, 'wm-property');
      
      expect(result).toEqual([]);
    });

    it('should return empty array when property does not exist on any matching mentions', () => {
      const targetUrl = 'https://frontendweekly.tokyo/posts/2021-01-13-v299/';
      const result = webmentionProperty(mockMentions, targetUrl, 'nonexistent-property');
      
      expect(result).toEqual([]);
    });

    it('should handle empty mentions array', () => {
      const result = webmentionProperty([], 'https://frontendweekly.tokyo/posts/2021-01-13-v299/', 'wm-property');
      
      expect(result).toEqual([]);
    });

    it('should handle null/undefined mentions', () => {
      expect(() => webmentionProperty(null, 'https://frontendweekly.tokyo/posts/2021-01-13-v299/', 'wm-property')).toThrow();
      expect(() => webmentionProperty(undefined, 'https://frontendweekly.tokyo/posts/2021-01-13-v299/', 'wm-property')).toThrow();
    });

    it('should handle nested property access', () => {
      const targetUrl = 'https://frontendweekly.tokyo/posts/2021-01-13-v299/';
      const result = webmentionProperty(mockMentions, targetUrl, 'author.name');
      
      expect(result).toEqual(['John Doe', 'Bob Wilson', 'Alice Brown']);
    });

    it('should handle mentions with mixed property types', () => {
      const mixedMentions = [
        {
          'wm-target': 'https://frontendweekly.tokyo/posts/test/',
          'wm-property': 'like-of',
          'string-value': 'test',
          'number-value': 42,
          'boolean-value': true,
          'null-value': null,
          'undefined-value': undefined,
          'empty-string': ''
        }
      ];
      
      const result = webmentionProperty(mixedMentions, 'https://frontendweekly.tokyo/posts/test/', 'string-value');
      expect(result).toEqual(['test']);
      
      const numberResult = webmentionProperty(mixedMentions, 'https://frontendweekly.tokyo/posts/test/', 'number-value');
      expect(numberResult).toEqual([42]);
      
      const booleanResult = webmentionProperty(mixedMentions, 'https://frontendweekly.tokyo/posts/test/', 'boolean-value');
      expect(booleanResult).toEqual([true]);
      
      const nullResult = webmentionProperty(mixedMentions, 'https://frontendweekly.tokyo/posts/test/', 'null-value');
      expect(nullResult).toEqual([]);
      
      const undefinedResult = webmentionProperty(mixedMentions, 'https://frontendweekly.tokyo/posts/test/', 'undefined-value');
      expect(undefinedResult).toEqual([]);
      
      const emptyStringResult = webmentionProperty(mixedMentions, 'https://frontendweekly.tokyo/posts/test/', 'empty-string');
      expect(emptyStringResult).toEqual([]);
    });

    it('should handle property with empty string value', () => {
      const mentionsWithEmptyString = [
        {
          'wm-target': 'https://frontendweekly.tokyo/posts/test/',
          'wm-property': 'like-of',
          'empty-string': ''
        }
      ];
      
      const result = webmentionProperty(mentionsWithEmptyString, 'https://frontendweekly.tokyo/posts/test/', 'empty-string');
      expect(result).toEqual([]);
    });

    it('should handle property with zero value', () => {
      const mentionsWithZero = [
        {
          'wm-target': 'https://frontendweekly.tokyo/posts/test/',
          'wm-property': 'like-of',
          'zero-value': 0
        }
      ];
      
      const result = webmentionProperty(mentionsWithZero, 'https://frontendweekly.tokyo/posts/test/', 'zero-value');
      expect(result).toEqual([0]);
    });

    it('should handle property with false value', () => {
      const mentionsWithFalse = [
        {
          'wm-target': 'https://frontendweekly.tokyo/posts/test/',
          'wm-property': 'like-of',
          'false-value': false
        }
      ];
      
      const result = webmentionProperty(mentionsWithFalse, 'https://frontendweekly.tokyo/posts/test/', 'false-value');
      expect(result).toEqual([false]);
    });
  });
});
