import posthtml from 'posthtml';
import posthtmlUrls from 'posthtml-urls';

/**
 * Generates a JSON Feed (version 1.1) for the blog
 */
export default class {
  /**
   * Returns configuration data for the feed
   * @returns {Object} Feed configuration
   */
  async data() {
    return {
      permalink: '/feed.json',
      eleventyExcludeFromCollections: true,
    };
  }

  /**
   * Processes HTML content to make URLs absolute
   * @param {string} content - HTML content to process
   * @param {string} baseURL - Base URL for making relative URLs absolute
   * @returns {Promise<string>} Processed HTML with absolute URLs
   */
  async prepareContent(content, baseURL) {
    const prep = posthtml().use(
      posthtmlUrls({
        eachURL: (url) => {
          const trimmedUrl = url.trim();

          // #anchor in-page
          if (trimmedUrl.indexOf('#') === 0) {
            return trimmedUrl;
          }

          if (trimmedUrl.indexOf('http') === 0) {
            return trimmedUrl;
          }

          return `${baseURL}${trimmedUrl}`;
        },
      })
    );

    const processed = await prep.process(content);
    return processed.html.replace(/\n/g, ' ');
  }

  /**
   * Renders the JSON feed with all posts
   * @param {Object} data - Eleventy data object containing site and collections
   * @returns {Promise<string>} JSON string representation of the feed
   */
  async render(data) {
    // eslint-disable-next-line sonarjs/prefer-object-literal
    const feed = {};

    feed.version = 'https://jsonfeed.org/version/1.1';
    feed.user_comment = `This is a blog feed. You can add this to your feed reader using the following URL: ${data.site.url}/feed.json`;
    feed.title = `${data.site.name}`;
    feed.home_page_url = `${data.site.url}`;
    feed.feed_url = `${data.site.url}/feed.json`;
    feed.description = `${data.site.description}`;
    feed.favicon = `${data.site.url}/favicon.ico`;
    feed.authors = [
      {
        name: `${data.site.author.name}`,
        url: `${data.site.url}`,
      },
    ];

    feed.items = [];

    for (const post of data.collections.posts) {
      const absolutePostUrl = `${data.site.url}${post.url}`;

      const item = {
        id: absolutePostUrl,
        url: absolutePostUrl,
      };

      item.title = post.data.title;
      item.summary = post.data.desc;
      item.content_html = await this.prepareContent(post.templateContent);
      item.date_published = post.data.date;
      item.authors = [
        {
          name: `${post.data.author}`,
        },
      ];

      feed.items.push(item);
    }

    return JSON.stringify(feed, null, 2);
  }
}
