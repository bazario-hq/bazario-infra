// A crawler (search engine or price comparison bot) walking category listings
// and product pages.
//
//   make load ENV=staging LOAD_SCENARIO=crawler
export { crawler } from './lib/journeys.js';

export const options = {
  scenarios: {
    crawler: {
      executor: 'constant-arrival-rate',
      exec: 'crawler',
      rate: Number(__ENV.CRAWLER_VISITS_PER_MINUTE || 60),
      timeUnit: '1m',
      duration: __ENV.DURATION || '10m',
      preAllocatedVUs: 5,
      maxVUs: 50,
    },
  },
  summaryTrendStats: ['avg', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};
