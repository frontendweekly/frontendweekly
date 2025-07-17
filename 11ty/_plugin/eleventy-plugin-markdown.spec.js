import { beforeEach, describe, expect, test, vi } from 'vitest';
import eleventyPluginMarkdown from './eleventy-plugin-markdown.js';

// Mock the dependencies
vi.mock('markdown-it', () => ({
  default: () => ({
    use: vi.fn().mockReturnThis(),
  }),
}));
vi.mock('markdown-it-anchor', () => ({
  default: vi.fn(),
}));

describe('eleventy-plugin-markdown', () => {
  let eleventyConfig;

  beforeEach(() => {
    eleventyConfig = {
      setLibrary: vi.fn(),
    };
  });

  test('should set markdown library with default options', () => {
    eleventyPluginMarkdown(eleventyConfig);
    expect(eleventyConfig.setLibrary).toHaveBeenCalledWith(
      'md',
      expect.any(Object)
    );
  });

  test('should set markdown library with custom markdownItOptions', () => {
    const options = {
      markdownItOptions: {
        html: false,
        breaks: false,
        linkify: false,
      },
    };
    eleventyPluginMarkdown(eleventyConfig, options);
    expect(eleventyConfig.setLibrary).toHaveBeenCalled();
  });

  test('should set markdown library with custom markdownItAnchorOptions', () => {
    const options = {
      markdownItAnchorOptions: {
        level: 2,
      },
    };
    eleventyPluginMarkdown(eleventyConfig, options);
    expect(eleventyConfig.setLibrary).toHaveBeenCalled();
  });
});
