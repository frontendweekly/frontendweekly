// Import plugins
const rssPlugin = require('@11ty/eleventy-plugin-rss');
const syntaxHighlight = require('@11ty/eleventy-plugin-syntaxhighlight');
const markdown = require('@frontendweekly/eleventy-plugin-markdown');

// Import collection
const collectionPost = require('@frontendweekly/collection-posts');
const collectionPostFeed = require('@frontendweekly/collection-postfeed');

// Filters
const filterHead = require('@frontendweekly/filter-head');
const filterDateOrdinalSuffix = require('@frontendweekly/filter-date-ordinal-suffix');
const filterDateIso = require('@frontendweekly/filter-date-iso');
const filters = require('./11ty/_filters/filters.js');

// Import transforms
const transformHtmlMin = require('@frontendweekly/transform-htmlmin');
const transformEnhancePostIframe = require('@frontendweekly/transform-enhance-post-iframe');
const transformEnhancePostCodeBlock = require('@frontendweekly/transform-enhance-post-code-block');

// Import data files
const site = require('./11ty/_data/site.json');

module.exports = function (config) {
  // Watch postcss
  config.addWatchTarget('./11ty/_postcss/');

  // Plugins
  config.addPlugin(rssPlugin);
  config.addPlugin(syntaxHighlight);
  config.setLibrary('md', markdown);

  // Filters
  Object.keys(filters).forEach((filterName) => {
    config.addFilter(filterName, filters[filterName]);
  });
  config.addFilter('dateOrdinalSuffixFilter', filterDateOrdinalSuffix);
  config.addFilter('dateIsoFilter', filterDateIso);
  config.addFilter('head', filterHead);

  // Transforms
  config.addTransform('enhancePostIframe', transformEnhancePostIframe);
  config.addTransform('enhancePostCodeBlock', transformEnhancePostCodeBlock);
  config.addTransform('htmlmin', transformHtmlMin);

  // Passthrough copy
  config.addPassthroughCopy('11ty/images');
  config.addPassthroughCopy('11ty/favicon.*');
  config.addPassthroughCopy('11ty/humans.txt');

  // Layout aliases
  config.addLayoutAlias('home', 'layouts/home.njk');

  // Custom collections
  config.addCollection('posts', (collection) =>
    collectionPost(collection, './11ty/posts/*.md')
  );
  config.addCollection('postFeed', (collection) =>
    collectionPostFeed(collection, './11ty/posts/*.md', site.maxPostsPerPage)
  );

  return {
    dir: {
      input: '11ty',
      output: 'dist',
    },
    templateFormats: ['njk', 'md', '11ty.js'],
    htmlTemplateEngine: 'njk',
    markdownTemplateEngine: 'njk',
    passthroughFileCopy: true,
  };
};
