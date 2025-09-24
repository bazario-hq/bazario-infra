// The last days of the month: sellers watch month-to-date numbers and finance
// pulls quarter exports, on top of normal shopping.
//
//   make load ENV=staging LOAD_SCENARIO=month-end
import { sleep } from 'k6';
import exec from 'k6/execution';
import { get } from './lib/api.js';
import { session } from './lib/api.js';
import { manifest } from './lib/env.js';
import { isoDaysAgo, pick } from './lib/pick.js';

export { browse, shopper } from './lib/journeys.js';

const duration = __ENV.DURATION || '10m';

function bigSeller() {
  const m = manifest();
  const store = m.bigSellers[exec.vu.idInTest % m.bigSellers.length];
  return session('month-end', () => store.email);
}

export function sellerDashboard() {
  const s = bigSeller();
  if (!s) return;
  get('GET /api/seller/dashboard', `/api/seller/dashboard?range=${pick(['mtd', 'mtd', 'mtd', '30d', '7d'])}`, { token: s.token });
  sleep(5 + Math.random() * 10);
}

export function financeExport() {
  const s = bigSeller();
  if (!s) return;
  get('GET /api/seller/payouts', '/api/seller/payouts', { token: s.token });
  get('GET /api/seller/sales/export.csv', `/api/seller/sales/export.csv?from=${isoDaysAgo(90)}&to=${isoDaysAgo(0)}`, { token: s.token, responseType: 'none' });
}

export const options = {
  scenarios: {
    dashboards: { executor: 'constant-vus', exec: 'sellerDashboard', vus: Number(__ENV.SELLER_TABS || 10), duration },
    finance: { executor: 'constant-arrival-rate', exec: 'financeExport', rate: Number(__ENV.EXPORTS_PER_MINUTE || 2), timeUnit: '1m', duration, preAllocatedVUs: 2, maxVUs: 10 },
    browsing: { executor: 'constant-arrival-rate', exec: 'browse', rate: 30, timeUnit: '1m', duration, preAllocatedVUs: 5, maxVUs: 30 },
    shoppers: { executor: 'constant-arrival-rate', exec: 'shopper', rate: 20, timeUnit: '1m', duration, preAllocatedVUs: 5, maxVUs: 30 },
  },
  summaryTrendStats: ['avg', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};
