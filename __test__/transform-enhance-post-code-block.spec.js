import { describe, expect, test } from 'vitest';
import transformEnhancePostCodeBlock from '../11ty/_transform/transform-enhance-post-code-block.js';

describe('transform-enhance-post-code-block', () => {
  test('should add data-lang attribute to code blocks', () => {
    const html = '<pre><code class="language-js">console.log(1);</code></pre>';
    const result = transformEnhancePostCodeBlock(html, 'test.html');
    expect(result).toContain('data-lang="js"');
  });

  test('should return content unchanged if not HTML', () => {
    const content = 'Just some text';
    expect(transformEnhancePostCodeBlock(content, 'test.txt')).toBe(content);
  });
});
