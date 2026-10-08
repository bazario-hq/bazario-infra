// One pass through every journey with a single user each. Proves the load
// generator, the manifest and the API agree before starting a long run.
//
//   make load ENV=dev LOAD_SCENARIO=smoke
import { profile } from './lib/env.js';

export { browse, search, shopper, checkout, flashSaleBuyer, seller, admin, crawler, signIn } from './lib/journeys.js';

// Take every branch of the seller journey once; keep spreadsheets clean.
Object.assign(profile.seller, { fulfilShare: 1, stockTakeShare: 1, stockTakeUnknownRowShare: 0, stockTakeRows: [5, 20], priceEditShare: 1, payoutsShare: 1, exportShare: 1 });
profile.search.typingShare = 0.5;

const journeys = ['browse', 'search', 'shopper', 'checkout', 'flashSaleBuyer', 'seller', 'admin', 'crawler', 'signIn'];

export const options = {
  scenarios: Object.fromEntries(
    journeys.map((exec, i) => [exec, { executor: 'per-vu-iterations', exec, vus: 1, iterations: 3, startTime: `${i * 2}s`, maxDuration: '3m' }]),
  ),
  thresholds: { checks: ['rate>0.98'] },
};
