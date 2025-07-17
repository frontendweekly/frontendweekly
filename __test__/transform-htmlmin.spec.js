import { describe, expect, test } from 'vitest';
import transformHtmlMin from '../11ty/_transforms/transform-htmlmin.js';

describe('transform-htmlmin', () => {
  test('should minify HTML content', async () => {
    const html =
      '<!DOCTYPE html>\n<html>\n  <head>\n    <title>Test</title>\n  </head>\n  <body>\n    <!-- comment -->\n    <h1>  Hello   World  </h1>\n  </body>\n</html>';
    const minified = await transformHtmlMin(html, 'test.html');
    expect(minified).toMatch(/<!doctype html>/i);
    expect(minified).not.toContain('<!-- comment -->');
    expect(minified).not.toContain('  ');
  });

  test('should return content unchanged if not HTML', async () => {
    const content = 'Just some text';
    expect(await transformHtmlMin(content, 'test.txt')).toBe(content);
  });
});
