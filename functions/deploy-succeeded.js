// Stolen from https://github.com/maxboeck/mxb/blob/master/_lambda/deploy-succeeded.js
import fetch from 'node-fetch';
import dotenv from '@dotenvx/dotenvx';
import { TwitterApi } from 'twitter-api-v2';

dotenv.config();

// URL of site JSON feed
const FEED_URL = 'https://frontendweekly.tokyo/feed.json';

/**
 * Returns a Twitter API v2 client using credentials from environment variables.
 * @returns {TwitterApi} An authenticated TwitterApi client instance.
 */
export function getTwitterClient() {
  return new TwitterApi({
    appKey: process.env.TWITTER_CONSUMER_KEY,
    appSecret: process.env.TWITTER_CONSUMER_SECRET,
    accessToken: process.env.TWITTER_ACCESS_TOKEN_KEY,
    accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
  });
}

/**
 * Handles and logs errors, returning a standard error response object.
 * @param {Error|Array} err - The error object or array of errors.
 * @returns {{statusCode: number, body: string}} Error response object.
 */
export const handleError = (err) => {
  console.error(err);
  const msg = Array.isArray(err) ? err[0].message : err.message;
  return {
    statusCode: 422,
    body: String(msg),
  };
};

/**
 * Returns a standard status response object and logs the message.
 * @param {number} code - HTTP status code.
 * @param {string} msg - Message to log and return.
 * @returns {{statusCode: number, body: string}} Status response object.
 */
export const status = (code, msg) => {
  console.log(msg);
  return {
    statusCode: code,
    body: msg,
  };
};

/**
 * Checks the latest post and syndicates it to Twitter if not already syndicated.
 * @param {object} posts - The posts feed object (must have title and items).
 * @param {TwitterApi} twitter - The TwitterApi client instance.
 * @returns {Promise<{statusCode: number, body: string}>} Result of the operation.
 */
export const processPosts = async (posts, twitter) => {
  const siteTitle = posts.title;
  const items = posts.items;

  if (!items.length) {
    return status(404, 'No posts found to process.');
  }

  // assume the last post is not yet syndicated
  const latestPost = items[0];

  console.log('latestPost.url is ', latestPost.url);

  try {
    // check twitter for any tweets containing post URL using Twitter API v2
    // Search for tweets containing the post URL
    const searchResults = await twitter.v2.search(`${latestPost.url}`);
    
    if (searchResults.data && searchResults.data.length === 0) {
      return publishPost(siteTitle, latestPost, twitter);
    }
    if (searchResults.data && searchResults.data.length > 0) {
      return status(400, 'Latest post was already syndicated. No action taken.');
    }
    // Defensive: if searchResults is undefined or malformed
    return status(422, 'Unexpected Twitter API response.');
  } catch (err) {
    return handleError(err);
  }
};

/**
 * Prepares the tweet text for a post, ensuring it fits within Twitter's character limit.
 * @param {string} siteTitle - The site title.
 * @param {object} post - The post object (must have summary and url).
 * @returns {string} The formatted tweet text.
 */
export const prepareStatusText = (siteTitle, post) => {
  const tweetMaxLength = 280;
  const summaryLength = String(post.summary).length;
  const urlLength = String(post.url).length;
  const siteTitleLength = String(siteTitle).length;
  const viaLength = 3;
  const spaceLength = 3;
  const colon = 1;
  const maxLength =
    tweetMaxLength -
    summaryLength -
    viaLength -
    siteTitleLength -
    spaceLength -
    colon -
    urlLength;

  let tweetText = `${post.summary} via ${siteTitle}: `;

  // truncate text if its too long for a tweet.
  if (tweetText.length > maxLength) {
    tweetText = `${tweetText.substring(0, maxLength)}...`;
  }

  // include the post url at the end;
  tweetText += `${post.url}`;

  return tweetText;
};

/**
 * Publishes a post to Twitter.
 * @param {string} siteTitle - The site title.
 * @param {object} post - The post object (must have title, summary, url).
 * @param {TwitterApi} twitter - The TwitterApi client instance.
 * @returns {Promise<{statusCode: number, body: string}>} Result of the operation.
 */
export const publishPost = async (siteTitle, post, twitter) => {
  try {
    const statusText = prepareStatusText(siteTitle, post);
    const tweet = await twitter.v2.tweet(statusText);
    if (tweet && tweet.data) {
      return status(200, `Post ${post.title} successfully posted to Twitter.`);
    }
    return status(422, 'Error posting to Twitter API.');
  } catch (err) {
    return handleError(err);
  }
};

/**
 * Main Lambda Function Handler. Fetches the feed and syndicates the latest post to Twitter if needed.
 * @returns {Promise<{statusCode: number, body: string}>} Result of the operation.
 */
export async function handler() {
  const twitter = getTwitterClient();
  return fetch(FEED_URL)
    .then((response) => response.json())
    .then((posts) => processPosts(posts, twitter))
    .catch(handleError);
}
