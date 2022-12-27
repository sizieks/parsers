const valueSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    only: {
      default: true,
      type: 'boolean',
    },
    page: {
      default: 1,
      type: 'integer',
    },
    sortBy: {
      default: 'recent',
      enum: ['recent', 'helpful'],
    },
    sku: {
      type: 'string',
    },
  },
  required: ['sku'],
};

const resultSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    reviews: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          id: {
            type: 'string',
          },
          author: {
            type: 'string',
          },
          rating: {
            type: 'number',
            minimum: 0,
            maximum: 5,
          },
          title: {
            type: 'string',
          },
          date: {
            type: 'string',
            format: 'date-time',
          },
          product: {
            anyOf: [{ type: 'object' }, { type: 'null' }],
          },
          content: {
            anyOf: [{ type: 'string' }, { type: 'null' }],
          },
          helpful: {
            type: 'integer',
          },
        },
        required: [
          'id',
          'author',
          'rating',
          'title',
          'date',
          'product',
          'content',
          'helpful',
        ],
      },
    },
    stats: {
      type: 'object',
      additionalProperties: false,
      properties: {
        ratings: {
          type: 'integer',
        },
        reviews: {
          type: 'integer',
        },
        pages: {
          type: 'integer',
        },
      },
      required: ['ratings', 'reviews', 'pages'],
    },
    found: {
      type: 'boolean',
    },
  },
  required: ['reviews', 'stats', 'found'],
};

const getURL = (value) => {
  const url = new URL(`https://foo.com/reviews/${value.sku}/`);

  value.page
    ? url.searchParams.append('pageNumber', value.page)
    : url.searchParams.append('pageNumber', 1);

  value.sortBy
    ? url.searchParams.append('sortBy', value.sortBy)
    : url.searchParams.append('sortBy', 'recent');

  return url.toString();
};

const parseError = () => {
  const error = document.querySelector('#g div img');

  return error && error.alt === "Sorry! We couldn't find that page. " +
    "Try searching or go to the home page." || false;
};

const parseStats = () => {
  const info = document.querySelector('[data-hook="cr-filter-info-section"]');

  return {
    ratings: info
      ? +info.innerText.match(/(.*)(?= total)/g)[0].replace(/,/g, '')
      : 0,
    reviews: info
      ? +info.innerText
          .match(/(?<=ratings, | rating, )(.*)(?= with)/g)[0]
          .replace(/,/g, '')
      : 0,
    pages: info ? (reviews > 5000 ? 500 : Math.ceil(reviews / 10)) : 0,
  };
};

const parseProduct = (product) => {
  const object = {};

  product.childNodes.forEach((node) => {
    if (node.nodeName === '#text') {
      const substrings = node.textContent.split(':');
      object[substrings[0].toLowerCase()] = substrings[1].trim();
    }
  });

  return object;
};

const parseHelpful = (helpful) => {
  const likes = helpful.innerText.split(' ')[0];

  return parseInt(likes.replace(/,/, '')) || 1; // 'a person found this helpful'
};

const parseReviews = () => {
  const reviews = document.querySelectorAll('[data-hook="review"]');

  return Array.from(reviews, (review) => {
    const author = review.querySelector('.a-profile-name');
    const rating = review.querySelector('.review-rating');
    const title = review.querySelector('.review-title');
    const date = review.querySelector('[data-hook="review-date"]');
    const product = review.querySelector('[data-hook^="format-strip"]');
    const content = review.querySelector('[data-hook="review-body"] > span');
    const helpful = review.querySelector('[data-hook="helpful-vote-statement"]');

    return {
      id: review.getAttribute('id'),
      author: author.innerText,
      rating: parseFloat(rating.innerText.split(' ')[0]),
      title: title.innerText.trim(),
      date: new Date(date.innerText).toISOString(),
      product: product ? parseProduct(product) : null,
      content: content ? content.innerText.trim() : null,
      helpful: helpful ? parseHelpful(helpful) : 0,
    };
  });
};

const taskNextPage = async (page, only) => {
  await GRABCORE.shedule_task({
    handler: 'foo_reviews',
    value: {
      only: only,
      page,
      sku: value.sku,
    },
  });
};

const main = async () => {
  if (document.querySelector('form[action="/errors/validateCaptcha"]')) {
    await GRABCORE.ban('Captcha');
  }

  const error = parseError();
  const stats = parseStats();
  const reviews = parseReviews();

  if (error) {
    return {
      reviews,
      stats,
      found: false,
    };
  } else if (value.only && !value.date) {
    for (let page = value.page + 1; page <= stats.pages; page++) {
      await taskNextPage(page, true);
    }
  } else if (value.only) {
    const dateUTC = new Date(value.date);
    const beforeDate = new Date(dateUTC.setDate(dateUTC.getDate() + 1)).toISOString();

    if (reviews.every((review) => review.date > beforeDate)) {
      await taskNextPage(value.page + 1, false);
    }
  }

  return {
    reviews,
    stats,
    found: true,
  };
};
