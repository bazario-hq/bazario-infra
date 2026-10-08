// A marketing email goes out and thousands of people sign in within a minute or
// two, while the catalogue keeps serving normal traffic.
//
//   make load ENV=staging LOAD_SCENARIO=login-burst
import { profile } from './lib/env.js';

export { browse, signIn } from './lib/journeys.js';

const lb = profile.loginBurst;
const seconds = Number(__ENV.LOGIN_BURST_SECONDS || lb.seconds);
const rate = Number(__ENV.LOGINS_PER_SECOND || lb.perSecond);

export const options = {
  scenarios: {
    browsing: { executor: 'constant-arrival-rate', exec: 'browse', rate: 60, timeUnit: '1m', duration: `${seconds + 60}s`, preAllocatedVUs: 10, maxVUs: 60 },
    logins: { executor: 'constant-arrival-rate', exec: 'signIn', rate, timeUnit: '1s', startTime: '30s', duration: `${seconds}s`, preAllocatedVUs: rate * 2, maxVUs: rate * 6 },
  },
  summaryTrendStats: ['avg', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};
