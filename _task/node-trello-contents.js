const querystring = require('querystring');
const path = require('path');
const fs = require('fs');

const jq = require('node-jq');
const fetch = require('node-fetch');
const dotenv = require('dotenv');
const fg = require('fast-glob');

const qoa = require('qoa');
const signale = require('signale');
const matter = require('gray-matter');

dotenv.config();

// Configuration
/// Posts location
const POSTS_DIR = path.resolve(process.env.PWD, 'src/posts');

/// Get next vol from POSTS_DIR
const getNextVol = () => {
  const filepathes = (element) => path.basename(element, path.extname(element));
  const volume = (element) =>
    element.replace(/([12]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]))-(v)/g, '');
  const latest = fg
    .sync(`${POSTS_DIR}/*.md`)
    .map(filepathes)
    .map(volume)
    .sort((a, b) => b - a)[0];
  return Number(latest) + 1;
};

/// Get next Wednesday
const getNextWednesday = () => {
  // Helper Function to format date into YYYY-MM-DD
  const yyyymmddify = (date) => {
    return date.toISOString().split('T')[0];
  };

  const date = new Date();
  date.setDate(date.getDate() + ((3 + 7 - date.getDay()) % 7));
  return yyyymmddify(date);
};

/// Question
const ps = [
  {
    type: 'input',
    query: `Enter next vol number. Next one should be ${getNextVol()}:`,
    handle: 'title',
  },
  {
    type: 'input',
    query: `Enter next publish date. Next one should be ${getNextWednesday()}:`,
    handle: 'date',
  },
];

// Helper functions
/// Helper Function to return unknown errors
const handleError = (err) => {
  signale.fatal(err);
  process.exit(1);
};

/// Fetch cards from Trello
const getCards = async () => {
  /// Trello API URL
  const TRELLO_API_URL_PREFIX = 'https://api.trello.com/1/lists/';

  /// Configure Trello API Client
  const TRELLO_API = {
    access_token_key: process.env.TRELLO_API_TOKEN_KEY,
    access_token_secret: process.env.TRELLO_API_TOKEN_SECRET,
  };

  /// Configure list. Our list is "Curated"
  const TRELLO_FE_WEEKLY_LIST = process.env.TRELLO_FE_WEEKLY_LIST;

  /// Generate querystring for Trello cards API
  const params = () => {
    return querystring.stringify({
      attachments: true,
      card_attachment_fields: 'url',
      fields: 'id,name,desc,labels',
      key: TRELLO_API.access_token_key,
      token: TRELLO_API.access_token_secret,
    });
  };

  try {
    const requestURL = `${TRELLO_API_URL_PREFIX}${TRELLO_FE_WEEKLY_LIST}/cards?${params()}`;
    const response = await fetch(requestURL, {method: 'GET'});
    return response.json();
  } catch (err) {
    handleError(err);
  }
};

/// Prepare Template
const prepareTemplateData = async (response) => {
  /// Function to transform response using node-jq
  const transformResponse = async (res) => {
    const json = JSON.stringify(res, null, 2);
    const baseSchema =
      '.[] |= { id: .id, title: .name, desc: .desc, label: .labels[].name, url: .attachments[].url }';
    const filter = `${baseSchema}`;

    try {
      return await jq.run(filter, json, {
        input: 'string',
      });
    } catch (error) {
      handleError(error);
    }
  };

  return JSON.parse(await transformResponse(response));
};

/// Generate Content
const generateContent = async (tmplData, options) => {
  /// clean description
  const cleanDescription = (description) => {
    // Strip URL and /n from desc
    const removeNoise = (value) => {
      const regex = /(\\n|\\r)|http(s):\/\/\S*/gm;
      return value.replace(regex, '').trim();
    };

    return description ? removeNoise(description) : `FILL ME`;
  };

  /// Generate MUSTREAD
  const generateMustread = (tmplData) => {
    // ## [${Title}(${Link})
    // #### ${Translated Title}
    // ${Excerpt}
    // ↑ We will have 3 of this.
    // In Trello, this MUST be labeled as MUSTREAD
    const isMustRead = (element) => element.label === 'MUSTREAD';
    const mustRead = (element) => `
## [${element.title}](${element.url})
#### TRANSLATED TITLE

${cleanDescription(element.desc)}

`;

    return tmplData.filter(isMustRead).map(mustRead).join('');
  };

  /// Generate FEATURED
  const generateFeatured = (tmplData) => {
    // ## [${Title}(${Link})
    // ${Excerpt}
    // ↑ We will have about 4 of this.
    // In Trello, this MUST be labeled as FEATURED
    const isFeatured = (element) => element.label === 'FEATURED';
    const featured = (element) => `
## [${element.title}](${element.url})

${cleanDescription(element.desc)}

`;

    return tmplData.filter(isFeatured).map(featured).join('');
  };

  /// In Brief heading
  const generateInBriefHeading = () => `# In Brief{inbrief}`;

  /// Generate INBRIEF
  const generateInbrief = (tmplData) => {
    // InBrief is
    // - **[${Title}(${Link})]**: ${Translated Title}
    // ↑ We will have about 5 of this.
    // In Trello, this MUST be labeled as INBRIEF
    const isInBrief = (element) => element.label === 'INBRIEF';
    const inBrief = (element) =>
      `
- **[${element.title}](${element.url})**: TRANSLATED TITLE
`;

    return tmplData.filter(isInBrief).map(inBrief).join('');
  };

  const file = () => {
    return `
${generateMustread(tmplData)}
${generateFeatured(tmplData)}
${generateInBriefHeading()}
${generateInbrief(tmplData)}`;
  };

  const title = options.title ? `Vol.${options.title}` : `Vol.${getNextVol()}`;
  return matter.stringify(file(), {
    title,
    date: options.date || getNextWednesday(),
    desc: `3 OF TRANSLATED TITLE、ほか計${tmplData.length}リンク`,
    permalink: `/posts/${title}/`,
  });
};

// Main Function
(async () => {
  const cards = await getCards();
  const tmpl = await prepareTemplateData(cards);
  const options = await qoa.prompt(ps);
  const content = await generateContent(tmpl, options);

  const title = options.title || getNextVol();
  const date = options.date || getNextWednesday();

  // Save md
  const filePath = `${POSTS_DIR}/${date}-v${title}.md`;
  try {
    signale.success(`Creating new post: ${filePath}`);
    fs.writeFileSync(filePath, content, 'utf-8');
  } catch (err) {
    handleError(err);
  }
})();
