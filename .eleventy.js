// Import plugins
import rssPlugin from '@11ty/eleventy-plugin-rss';
import syntaxHighlight from '@11ty/eleventy-plugin-syntaxhighlight';
import markdown from './11ty/_plugins/eleventy-plugin-markdown.js';

// Import collection
import collectionPostFeed from './11ty/_collections/collection-postfeed.js';
import collectionPost from './11ty/_collections/collection-posts.js';

// Filters
import filterDateIso from './11ty/_filters/date-iso.js';
import filterDateOrdinalSuffix from './11ty/_filters/date-ordinal-suffix.js';
import filterHead from './11ty/_filters/head.js';
import * as webmentionFilters from './11ty/_filters/webmention.js';

// Import transforms
import transformEnhancePostCodeBlock from './11ty/_transforms/transform-enhance-post-code-block.js';
import transformEnhancePostIframe from './11ty/_transforms/transform-enhance-post-iframe.js';
import transformHtmlMin from './11ty/_transforms/transform-htmlmin.js';

// Import data files
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const site = JSON.parse(
  readFileSync(join(__dirname, '11ty/_data/site.json'), 'utf8')
);

export default function (eleventyConfig) {
  // Watch postcss
  eleventyConfig.addWatchTarget('./11ty/_postcss/');

  // Plugins
  eleventyConfig.addPlugin(rssPlugin);
  eleventyConfig.addPlugin(syntaxHighlight);
  markdown(eleventyConfig);

  // Filters
  for (const filterName of Object.keys(webmentionFilters)) {
    eleventyConfig.addFilter(filterName, webmentionFilters[filterName]);
  }
  eleventyConfig.addFilter('dateOrdinalSuffixFilter', filterDateOrdinalSuffix);
  eleventyConfig.addFilter('dateIsoFilter', filterDateIso);
  eleventyConfig.addFilter('head', filterHead);

  // Transforms
  eleventyConfig.addTransform('enhancePostIframe', transformEnhancePostIframe);
  eleventyConfig.addTransform(
    'enhancePostCodeBlock',
    transformEnhancePostCodeBlock
  );
  eleventyConfig.addTransform('htmlmin', transformHtmlMin);

  // Passthrough copy
  eleventyConfig.addPassthroughCopy('11ty/images');
  eleventyConfig.addPassthroughCopy('11ty/favicon.*');
  eleventyConfig.addPassthroughCopy('11ty/humans.txt');

  // Layout aliases
  eleventyConfig.addLayoutAlias('home', 'layouts/home.njk');

  // Custom collections
  eleventyConfig.addCollection('posts', (collection) =>
    collectionPost(collection, './11ty/posts/*.md')
  );
  eleventyConfig.addCollection('postFeed', (collection) =>
    collectionPostFeed(collection, './11ty/posts/*.md', site.maxPostsPerPage)
  );

  return {
    dir: {
      input: '11ty',
      output: 'dist',
      includes: '_includes',
    },
    templateFormats: ['njk', 'md', '11ty.js'],
    htmlTemplateEngine: 'njk',
    markdownTemplateEngine: 'njk',
  };
}
