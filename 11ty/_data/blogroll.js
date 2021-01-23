const signale = require('signale');
const CacheAsset = require('@11ty/eleventy-cache-assets');
const jq = require('node-jq');

require('dotenv').config();

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
    return await CacheAsset(FEEDBIN_API_URL, {
      duration: '1d',
      type: 'json',
      fetchOptions: FEEDBIN_API_OPTION,
    });
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
module.exports = async function () {
  const subscription = await getSubscription();
  if (subscription) {
    const blogroll = await transformJSON(JSON.stringify(subscription, null, 2));
    const json = JSON.parse(blogroll);

    signale.info(`blogroll has ${json.items.length} items`);
    return json;
  }
};
