import { describe, expect, test } from 'vitest';
import transformEnhancePostIframe from '../11ty/_transform/transform-enhance-post-iframe.js';

describe('transform-enhance-post-iframe', () => {
  test('should add loading="lazy" to iframes', () => {
    const html = '<iframe src="foo"></iframe>';
    const result = transformEnhancePostIframe(html, 'test.html');
    expect(result).toContain('loading="lazy"');
  });

  test('should return content unchanged if not HTML', () => {
    const content = 'Just some text';
    expect(transformEnhancePostIframe(content, 'test.txt')).toBe(content);
  });
});
