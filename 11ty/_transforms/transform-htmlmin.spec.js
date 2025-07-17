import { describe, test, expect } from 'vitest';
import transformHtmlMin from './transform-htmlmin.js';

describe('transform-htmlmin', () => {
  test('should minify HTML content', () => {
    const html = `<!DOCTYPE html>\n<html>\n  <head>\n    <title>Test</title>\n  </head>\n  <body>\n    <!-- comment -->\n    <h1>  Hello   World  </h1>\n  </body>\n</html>`;
    const minified = transformHtmlMin(html, 'test.html');
    expect(minified).toContain('<!DOCTYPE html>');
    expect(minified).not.toContain('<!-- comment -->');
    expect(minified).not.toContain('  ');
  });

  test('should return content unchanged if not HTML', () => {
    const content = 'Just some text';
    expect(transformHtmlMin(content, 'test.txt')).toBe(content);
  });
}); 