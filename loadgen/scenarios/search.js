// Search-heavy traffic, including people typing into the refine box.
//
//   make load ENV=staging LOAD_SCENARIO=search
import { profile } from './lib/env.js';

export { search } from './lib/journeys.js';

profile.search.typingShare = Number(__ENV.TYPING_SHARE || 0.5);

export const options = {
  scenarios: {
    search: {
      executor: 'constant-arrival-rate',
      exec: 'search',
      rate: Number(__ENV.SEARCHES_PER_MINUTE || 20),
      timeUnit: '1m',
      duration: __ENV.DURATION || '5m',
      preAllocatedVUs: 5,
      maxVUs: 60,
    },
  },
  summaryTrendStats: ['avg', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};
