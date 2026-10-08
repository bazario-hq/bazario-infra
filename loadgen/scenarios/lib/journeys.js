// User journeys. Each function is one visit: a handful of requests with short
// think times, the way the web app calls the API.
import { sleep } from 'k6';
import exec from 'k6/execution';
import { get, send, json, images, session, login } from './api.js';
import { manifest, profile } from './env.js';
import { address, buyerEmail, category, chance, isoDaysAgo, pick, productId, rand, searchTerm, sellerFor, skewedIndex, weighted } from './pick.js';

const think = (min = 0.5, max = 3) => sleep(min + Math.random() * (max - min));
const cardImages = (items) => (items || []).map((p) => (p.image ? p.image.largeUrl : null));

function viewProduct(id, token) {
  const res = get('GET /api/products/:id', `/api/products/${id}`, { token, ok: [200, 404] });
  const product = res.status === 200 ? json(res) : null;
  get('GET /api/products/:id/reviews', `/api/products/${id}/reviews?page=1&pageSize=10`, { ok: [200, 404] });
  if (product) images((product.images || []).map((i) => i.largeUrl), 2);
  return product;
}

/** Anonymous visitor: home, a category or two, a product. */
export function browse() {
  const b = profile.browse;
  const home = json(get('GET /api/home', '/api/home'));
  get('GET /api/categories', '/api/categories');
  if (home) images(cardImages(home.trending).concat(cardImages(home.newArrivals)), b.imagesPerPage);
  think();

  const slug = category();
  const deep = chance(b.deepPageShare);
  const page = deep ? rand(20, b.maxDeepPage) : chance(0.3) ? rand(2, 5) : 1;
  const sort = weighted({ newest: 0.5, popular: 0.25, price_asc: 0.15, rating: 0.1 });
  get('GET /api/categories/:slug', `/api/categories/${slug}`, { ok: [200, 404] });
  const list = json(get('GET /api/products', `/api/products?category=${slug}&sort=${sort}&page=${page}&pageSize=24`));
  if (list && !deep) images(cardImages(list.items), b.imagesPerPage);
  think();

  const items = (list && list.items) || [];
  const id = items.length && chance(b.listingClickShare) ? items[skewedIndex(Math.min(items.length, 8))].id : productId();
  viewProduct(id);
  if (chance(0.15)) {
    think();
    get('GET /api/sellers/:slug', `/api/sellers/${pick(manifest().storefronts)}`, { ok: [200, 404] });
  }
}

/** Search box use, optionally typed letter by letter (as the refine box sends it). */
export function search() {
  const s = profile.search;
  const term = searchTerm();
  if (chance(s.typingShare)) {
    for (let i = 2; i < term.length; i++) {
      get('GET /api/products', `/api/products?q=${encodeURIComponent(term.slice(0, i))}&pageSize=24`);
      sleep(0.12 + Math.random() * 0.15);
    }
  }
  const res = json(get('GET /api/products', `/api/products?q=${encodeURIComponent(term)}&pageSize=24`));
  if (res) images(cardImages(res.items), profile.browse.imagesPerPage);
  think();
  if (res && res.meta && res.meta.totalPages > 1 && chance(s.secondPageShare)) {
    get('GET /api/products', `/api/products?q=${encodeURIComponent(term)}&page=2&pageSize=24`);
    think();
  }
  if (res && res.items && res.items.length) viewProduct(res.items[skewedIndex(res.items.length)].id);
}

/** Signed-in buyer: badge, wishlist, cart, order history. */
export function shopper() {
  const s = session('buyer', buyerEmail);
  if (!s) return;
  const token = s.token;
  get('GET /api/notifications/unread-count', '/api/notifications/unread-count', { token });
  const roll = Math.random();
  if (roll < 0.35) {
    const orders = json(get('GET /api/orders', `/api/orders?page=1&pageSize=10`, { token }));
    think();
    if (orders && orders.items && orders.items.length && chance(0.5)) {
      get('GET /api/orders/:id', `/api/orders/${pick(orders.items).id}`, { token });
    }
  } else if (roll < 0.6) {
    get('GET /api/wishlist', '/api/wishlist', { token });
    const id = productId();
    send(chance(0.7) ? 'PUT' : 'DELETE', 'PUT|DELETE /api/wishlist/:productId', `/api/wishlist/${id}`, null, { token, ok: [200, 204, 404] });
  } else if (roll < 0.8) {
    get('GET /api/cart', '/api/cart', { token });
    const id = productId();
    send('PUT', 'PUT /api/cart/items/:productId', `/api/cart/items/${id}`, { quantity: 1 }, { token, ok: [200, 404, 409, 422] });
  } else if (roll < 0.9) {
    get('GET /api/notifications', '/api/notifications?page=1&pageSize=20', { token });
  } else {
    get('GET /api/auth/me', '/api/auth/me', { token });
    viewProduct(productId(), token);
  }
}

function buy(token, productIds, name) {
  send('DELETE', 'DELETE /api/cart', '/api/cart', null, { token });
  for (const id of productIds) {
    send('PUT', 'PUT /api/cart/items/:productId', `/api/cart/items/${id}`, { quantity: chance(0.85) ? 1 : 2 }, { token, ok: [200, 404, 409, 422] });
  }
  const quote = json(send('POST', 'POST /api/checkout/quote', '/api/checkout/quote', { shippingAddress: address(name) }, { token, ok: [200, 201, 422] }));
  if (!quote || !quote.quoteId) return null;
  think(1, 4);
  const declined = chance(profile.checkout.declinedCardShare);
  return send(
    'POST',
    'POST /api/checkout/confirm',
    '/api/checkout/confirm',
    {
      quoteId: quote.quoteId,
      payment: { cardNumber: declined ? '4000 0000 0000 0002' : '4242 4242 4242 4242', expMonth: rand(1, 12), expYear: 2030, cvc: '123' },
    },
    { token, ok: [200, 201, 402, 409, 410, 422] },
  );
}

/** Signed-in buyer completing a purchase of popular products. */
export function checkout() {
  const s = session('checkout', buyerEmail);
  if (!s) return;
  const m = manifest();
  const lines = rand(1, profile.checkout.maxLines);
  const ids = [];
  for (let i = 0; i < lines; i++) ids.push(m.products.popular[skewedIndex(Math.min(300, m.products.popular.length))]);
  viewProduct(ids[0], s.token);
  think();
  buy(s.token, [...new Set(ids)], s.user ? s.user.name : 'Bazario Buyer');
}

/** Many buyers checking out the same promoted product at once. */
export function flashSaleBuyer() {
  const s = session('flash', (vu) => manifest().buyers[(vu * 104729) % manifest().buyers.length]);
  if (!s) return;
  const ids = manifest().products.flashSale;
  buy(s.token, [ids[exec.scenario.iterationInTest % ids.length]], s.user ? s.user.name : 'Bazario Buyer');
}

/** Seller back office: dashboard most of the time, plus fulfilment and stock work. */
export function seller() {
  const p = profile.seller;
  const vu = exec.vu.idInTest;
  const store = sellerFor(vu);
  const s = session('seller', () => store.email);
  if (!s) return;
  const token = s.token;

  const range = weighted(p.dashboardRanges);
  get('GET /api/seller/dashboard', `/api/seller/dashboard?range=${range}`, { token });
  get('GET /api/notifications/unread-count', '/api/notifications/unread-count', { token });
  think(2, 6);

  if (chance(p.fulfilShare)) {
    const orders = json(get('GET /api/seller/orders', '/api/seller/orders?status=pending&page=1&pageSize=20', { token }));
    const pending = (orders && orders.items) || [];
    if (pending.length) {
      const order = pending[pending.length - 1 - skewedIndex(pending.length)];
      const id = order.orderId || order.id;
      get('GET /api/seller/orders/:orderId', `/api/seller/orders/${id}`, { token, ok: [200, 404] });
      send('POST', 'POST /api/seller/orders/:orderId/ship', `/api/seller/orders/${id}/ship`, { trackingNumber: `RR${rand(100000000, 999999999)}LK` }, { token, ok: [200, 409] });
    }
  }
  if (chance(p.stockTakeShare)) {
    get('GET /api/seller/inventory', '/api/seller/inventory?page=1&pageSize=50', { token });
    const n = rand(p.stockTakeRows[0], Math.min(p.stockTakeRows[1], store.productIds.length));
    const items = store.productIds.slice(0, n).map((productId) => ({ productId, stock: rand(20, 400) }));
    // Spreadsheets drift: now and then a row refers to a listing that is gone.
    if (chance(p.stockTakeUnknownRowShare)) items[rand(0, items.length - 1)].productId = manifest().products.maxId + rand(1000, 900000);
    send('POST', 'POST /api/seller/inventory/bulk', '/api/seller/inventory/bulk', { items, reason: 'weekly stock take' }, { token, ok: [200, 404] });
  }
  if (chance(p.priceEditShare)) {
    const id = pick(store.productIds);
    const product = json(get('GET /api/seller/products/:id', `/api/seller/products/${id}`, { token, ok: [200, 404] }));
    if (product && product.priceCents) {
      const factor = chance(0.5) ? 0.95 : 1.05;
      send('PATCH', 'PATCH /api/seller/products/:id', `/api/seller/products/${id}`, { priceCents: Math.max(199, Math.round((product.priceCents * factor) / 100) * 100 - 1) }, { token, ok: [200, 404] });
    }
  }
  if (chance(p.payoutsShare)) get('GET /api/seller/payouts', '/api/seller/payouts', { token });
  if (chance(p.exportShare)) {
    get('GET /api/seller/sales/export.csv', `/api/seller/sales/export.csv?from=${isoDaysAgo(p.exportDays)}&to=${isoDaysAgo(0)}`, { token, responseType: 'none' });
  }
}

/** Seller ops and trust & safety in the admin area. */
export function admin() {
  const s = session('admin', () => manifest().admins[0]);
  if (!s) return;
  const token = s.token;
  const roll = Math.random();
  if (roll < 0.3) get('GET /api/admin/reports/overview', '/api/admin/reports/overview', { token });
  else if (roll < 0.6) get('GET /api/admin/users', `/api/admin/users?page=${chance(0.3) ? rand(50, 500) : rand(1, 5)}&pageSize=50`, { token });
  else if (roll < 0.8) get('GET /api/admin/reviews', '/api/admin/reviews?status=pending&page=1&pageSize=20', { token });
  else get('GET /api/admin/sellers', '/api/admin/sellers?page=1&pageSize=20', { token });
}

/** A crawler walking listings page by page and opening product pages. */
export function crawler() {
  const c = profile.crawler;
  const slug = category();
  const start = rand(1, 300);
  for (let i = 0; i < c.pagesPerVisit; i++) {
    if (chance(c.productShare)) get('GET /api/products/:id', `/api/products/${rand(1, manifest().products.maxId)}`, { ok: [200, 404] });
    else get('GET /api/products', `/api/products?category=${slug}&page=${start + i}&pageSize=24`);
    sleep(0.2 + Math.random() * 0.5);
  }
}

/** An open tab polling the notification badge. */
export function tab() {
  const t = profile.openTabs;
  const vu = exec.vu.idInTest;
  const sellerTab = (vu % 100) / 100 < t.sellers / (t.buyers + t.sellers);
  const s = sellerTab ? session('tab-seller', () => sellerFor(vu).email) : session('tab', buyerEmail);
  if (s) get('GET /api/notifications/unread-count', '/api/notifications/unread-count', { token: s.token });
  sleep(t.pollSeconds * (0.9 + Math.random() * 0.2));
}

/** A fresh sign-in (morning email campaigns, app re-opens). */
export function signIn() {
  const m = manifest();
  login(m.buyers[rand(0, m.buyers.length - 1)]);
}
