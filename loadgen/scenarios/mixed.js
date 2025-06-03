// Continuous synthetic production traffic: every journey at once, following a
// daily curve with short bursts. Used by `make load` in staging and prod-sim.
//
//   make load ENV=prod-sim                       (24 h by default)
//   make load ENV=prod-sim TRAFFIC_MULTIPLIER=3  (a busy day)
import { profile } from './lib/env.js';
import { compact, dailyArrival, dailyLoginBursts, dailyTabs } from './lib/schedule.js';

export { browse, search, shopper, checkout, seller, admin, crawler, tab, signIn } from './lib/journeys.js';

export const options = {
  discardResponseBodies: false,
  scenarios: compact({
    browse: dailyArrival('browse', { avgSeconds: 15, maxVUs: 120 }),
    search: dailyArrival('search', { avgSeconds: 30, maxVUs: 40 }),
    shopper: dailyArrival('shopper', { avgSeconds: 10, maxVUs: 60 }),
    checkout: dailyArrival('checkout', { avgSeconds: 15, maxVUs: 30 }),
    seller: dailyArrival('seller', { avgSeconds: 25, maxVUs: 40 }),
    admin: dailyArrival('admin', { avgSeconds: 10, maxVUs: 5 }),
    crawler: dailyArrival('crawler', { avgSeconds: 10, maxVUs: 20 }),
    tabs: dailyTabs(profile.openTabs.buyers + profile.openTabs.sellers),
    logins: dailyLoginBursts(),
  }),
  summaryTrendStats: ['avg', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};
