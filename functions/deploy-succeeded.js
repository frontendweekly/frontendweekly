// Stolen from https://github.com/maxboeck/mxb/blob/master/_lambda/deploy-succeeded.js
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { TwitterApi } from 'twitter-api-v2';

dotenv.config();

// URL of site JSON feed
const FEED_URL = 'https://frontendweekly.tokyo/feed.json';

// Factory for Twitter API Client
export function getTwitterClient() {
  return new TwitterApi({
    appKey: process.env.TWITTER_CONSUMER_KEY,
    appSecret: process.env.TWITTER_CONSUMER_SECRET,
    accessToken: process.env.TWITTER_ACCESS_TOKEN_KEY,
    accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
  });
}

// Helper Function to return unknown errors
export const handleError = (err) => {
  console.error(err);
  const msg = Array.isArray(err) ? err[0].message : err.message;
  return {
    statusCode: 422,
    body: String(msg),
  };
};

// Helper Function to return function status
export const status = (code, msg) => {
  console.log(msg);
  return {
    statusCode: code,
    body: msg,
  };
};

// Check existing posts
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

// Prepare the content string for tweet format
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

// Push a new post to Twitter
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

// Main Lambda Function Handler
export async function handler() {
  const twitter = getTwitterClient();
  return fetch(FEED_URL)
    .then((response) => response.json())
    .then((posts) => processPosts(posts, twitter))
    .catch(handleError);
}
