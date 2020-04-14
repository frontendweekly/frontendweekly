const fs = require('fs');
const {resolve} = require('path');

const jq = require('node-jq');
const fetch = require('node-fetch');

const CACHE_DIR = resolve(process.env.PWD, './_cache');

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
    const response = await fetch(`${FEEDBIN_API_URL}`, FEEDBIN_API_OPTION);
    return await response.json();
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

/// Save blogroll in cache file
const writeToCache = (data) => {
  const filePath = `${CACHE_DIR}/blogroll.json`;

  // create cache folder if it doesnt exist already
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR);
  }
  // write data to cache json file
  fs.writeFile(filePath, data, (err) => {
    if (err) throw err;
    console.log(`blogroll cached to ${filePath}`);
  });
};

// get cache contents from json file
const readFromCache = () => {
  const filePath = `${CACHE_DIR}/blogroll.json`;

  if (fs.existsSync(filePath)) {
    const cacheFile = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(cacheFile);
  }

  return {
    dateCreated: null,
    items: [],
  };
};

// Main Function
module.exports = async function () {
  const cache = readFromCache();
  const {lastFetched} = cache;

  // Only fetch new blogroll in production
  if (process.env.ELEVENTY_ENV === 'production' || !lastFetched) {
    const subscription = await getSubscription();
    if (subscription) {
      const json = JSON.stringify(subscription, null, 2);
      const blogroll = await transformJSON(json);

      writeToCache(blogroll);
      return JSON.parse(blogroll);
    }
  }

  console.log(`${cache.items.length} subscriptions loaded from cache`);
  return cache;
};
