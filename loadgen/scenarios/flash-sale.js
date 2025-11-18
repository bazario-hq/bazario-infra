// A promotion goes live: many buyers check out the same promoted products at
// the same moment, while normal browsing continues.
//
//   make load ENV=staging LOAD_SCENARIO=flash-sale
import { profile } from './lib/env.js';

export { browse, flashSaleBuyer } from './lib/journeys.js';

const f = profile.flashSale;
const seconds = Number(__ENV.FLASH_SALE_SECONDS || f.seconds);

export const options = {
  scenarios: {
    promo: { executor: 'constant-vus', exec: 'flashSaleBuyer', vus: Number(__ENV.FLASH_SALE_BUYERS || f.concurrentBuyers), duration: `${seconds}s` },
    browsing: { executor: 'constant-arrival-rate', exec: 'browse', rate: 30, timeUnit: '1m', duration: `${seconds}s`, preAllocatedVUs: 5, maxVUs: 30 },
  },
  summaryTrendStats: ['avg', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};
