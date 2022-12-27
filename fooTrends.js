const cookies = {
  "cookieOne": {
    "value": "42",
    "domain": "foo.bar.com",
    "path": "/",
    "expires": "2023-10-25T13:34:13.746Z"
  },
  "cookieTwo": {
    "value": "1337",
    "domain": ".bar.com",
    "path": "/",
    "expires": "2023-11-16T17:30:06.299Z"
  },
  "cookieThree": {
    "value": "3648",
    "domain": "foo.bar.com",
    "path": "/",
    "expires": "Session"
  },
};

const valueSchema = {
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "category": {
      "type": "string"
    },
    "dateFrom": {
      "type": "string",
      "format": "date",
    },
    "dateTo": {
      "type": "string",
      "format": "date"
    }
  },
  "required": ["dateFrom", "dateTo"],
  "examples": [
    {
      "dateFrom": "2022-10-18",
      "dateTo": "2022-11-14"
    }
  ]
};

const resultSchema = {
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "id": {
      "type": "integer"
    },
    "level": {
      "const": 2
    },
    "name": {
      "type": "string"
    },
    "trends": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "endDate": {
            "type": "string",
            "format": "date"
          },
          "platformMetric": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "dynamics": {
                "type": "number"
              },
              "value": {
                "type": "number"
              }
            },
            "required": ["dynamics", "value"]
          },
          "sellerMetric": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "dynamics": {
                "type": "number"
              },
              "value": {
                "type": "number"
              }
            },
            "required": ["dynamics", "value"]
          },
          "startDate": {
            "type": "string",
            "format": "date"
          }
        },
        "required": ["endDate", "platformMetric", "sellerMetric", "startDate"]
      }
    }
  },
  "required": ["id", "level", "name", "trends"]
};

const getURL = (value) => {
  return 'https://foo.bar.com/registration/signin';
};

const $ = (selector) => {
  return document.querySelector(selector);
};

const $$ = (selector) => {
  return document.querySelectorAll(selector);
};

const getCategories = (tree) => {
  const categoryList = [];
  const categoryTree = JSON.parse(JSON.stringify(tree.__vue__.categoryTree));

  Object.keys(categoryTree).forEach((category) => {
    categoryList.push(Object.keys(categoryTree[category]['nodes']));
  });

  return categoryList.flat(1);
};

const getTrends = () => {
  const trends = $('[data-onboarding-target="trendsOnboarding1"]')
    .__vue__
    .$slots
    .description[0]
    .context
    .trends;

  return JSON.parse(JSON.stringify(trends));
};

const renderDiagram = (diagram) => {
  return new Promise((resolve) => {
    new MutationObserver((mutations, observer) => {
      for (const mutation of mutations) {
        if (
          mutation.removedNodes[0] &&
          mutation.removedNodes[0].nodeName === 'svg'
        ) {
          observer.disconnect();
          return resolve();
        }
      }
    }).observe(diagram, {
      childList: true,
      subtree: true,
    });
  });
};

const signIn = async () => {
  if (!window.location.href.endsWith('trends')) {
    // external lib
    await setCookies(cookies);
    window.location.href = 'https://foo.bar.com/analytics/whatToSell/trends';
    // external lib
    await delay(5000);
  }

  return document.body.innerHTML;
};

const nextTask = async (category) => {
  await GRABCORE.shedule_task({
    handler: 'foo_trends',
    value: {
      category,
      cookies,
      dateFrom: value.dateFrom, // 'YYYY-MM-DD'
      dateTo: value.dateTo, // the range should not exceed 28 days
    },
  });
};

const main = async () => {
  await signIn();

  const diagramsHandler = $('[data-onboarding-target="trendsOnboarding1"]');
  const categoriesHandler = $('[data-onboarding-target="trendsOnboarding2"]');
  const categoryList = getCategories(categoriesHandler);

  for (let i = 0; i < categoryList.length; i++) {
    await categoriesHandler.__vue__.changeCategory(categoryList[i]);
    await diagramsHandler.__vue__.$store._actions[
      'analytics/whatToSell/trends/handleTrendsChangeDateRange'
    ][0]({ dateFrom: `${value.dateFrom}`, dateTo: `${value.dateTo}` });
    await renderDiagram(diagramsHandler);
    await nextTask(categoryList[i]);
  }

  return {
    id: categoriesHandler.__vue__.selectedCategory.id,
    level: categoriesHandler.__vue__.selectedCategory.level,
    name: categoriesHandler.__vue__.categoryNameText.replace(/Категория: /, ''),
    trends: getTrends(),
  };
};
