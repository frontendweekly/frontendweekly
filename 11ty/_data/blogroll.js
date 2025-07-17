import eleventyFetch from '@11ty/eleventy-fetch';
import dotenv from 'dotenv';
import jq from 'node-jq';
import signale from 'signale';

dotenv.config();

// Configuration
/// Feedbin API URL
const FEEDBIN_API_URL = 'https://api.feedbin.com/v2/subscriptions.json';
/// Configure Feedbin API option
const FEEDBIN_API_OPTION = {
  method: 'GET',
  headers: {
    Authorization: `Basic ${process.env.FEEDBIN_API_TOKEN}`,
  },
};

// Helpers function
/// Function to return unknown errors
const handleError = (err) => {
  console.error(err);
  return false;
};

/// Fetch latest subscriptions from Feedbin
const getSubscription = async () => {
  try {
    const response = await eleventyFetch(FEEDBIN_API_URL, {
      duration: '1d',
      fetchOptions: FEEDBIN_API_OPTION,
    });
    return response;
  } catch (err) {
    handleError(err);
  }
};

/// Function to transform JSON using node-jq
const transformJSON = async (json) => {
  const baseSchema = '{dateCreated: .[0].created_at, items: [.[]]}';
  const removeUnusedKey = '.items |= map(del(.id, .feed_id))';
  const removeDupe = '.items |= unique_by(.feed_url)';
  const sortByTitle = '.items |= sort_by(.title)';
  const AListApartURLFix =
    '.items |= map(if .title == "A List Apart" then .site_url = "https://alistapart.com" else . end)';
  const flagTwitter =
    '.items |= map(if .title|test("^Twitter List*.*") then .+ {twitter: true} else . end)';
  const flagNewsletter =
    '.items |= map(if .feed_url|test(".*\\\\?[0-9a-f]{5,40}") then .+ {newsletter: true} else . end)';

  const filter = `${baseSchema} | ${removeUnusedKey} | ${removeDupe} | ${sortByTitle} | ${AListApartURLFix} | ${flagTwitter} | ${flagNewsletter}`;

  const option = {
    input: 'string',
  };

  try {
    return await jq.run(filter, json, option);
  } catch (error) {
    console.log(error);
  }
};

// Main Function
export default async function () {
  const subscription = await getSubscription();
  if (subscription) {
    let blogroll;
    try {
      blogroll = await transformJSON(JSON.stringify(subscription, null, 2));
      // Always try to parse the result if it's a string
      if (typeof blogroll === 'string') {
        try {
          blogroll = JSON.parse(blogroll);
        } catch (parseErr) {
          signale.warn('Failed to parse transformed blogroll data, returning empty result');
          return { dateCreated: new Date().toISOString(), items: [] };
        }
      }
      // Only log info if items is an array
      if (blogroll && Array.isArray(blogroll.items)) {
        signale.info(`blogroll has ${blogroll.items.length} items`);
        return blogroll;
      } else {
        signale.warn('Transformed blogroll data missing items array, returning empty result');
        return { dateCreated: new Date().toISOString(), items: [] };
      }
    } catch (err) {
      signale.warn('Failed to transform blogroll data, returning empty result');
      return { dateCreated: new Date().toISOString(), items: [] };
    }
  }
  return { dateCreated: new Date().toISOString(), items: [] };
}
