// Random choices shaped like real usage: popular things are picked far more
// often than the long tail.
import { manifest, profile } from './env.js';

export const rand = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
export const chance = (p) => Math.random() < p;
export const pick = (items) => items[Math.floor(Math.random() * items.length)];

/** Index biased towards the start of a list (Zipf-ish). */
export function skewedIndex(length, s = 1.1) {
  const u = Math.random();
  return Math.min(length - 1, Math.floor(length * Math.pow(u, 1 + s)));
}

export function weighted(map) {
  const entries = Object.entries(map);
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let r = Math.random() * total;
  for (const [key, w] of entries) {
    r -= w;
    if (r <= 0) return key;
  }
  return entries[entries.length - 1][0];
}

/** A product id: mostly popular listings, sometimes anything in the catalogue. */
export function productId() {
  const m = manifest();
  if (chance(profile.browse.popularShare)) return m.products.popular[skewedIndex(m.products.popular.length)];
  return rand(1, m.products.maxId);
}

export function category() {
  const m = manifest();
  const depth = weighted({ 0: 0.45, 1: 0.35, 2: 0.2 });
  const options = m.categories.filter((c) => String(c.depth) === depth);
  return pick(options.length ? options : m.categories).slug;
}

export function searchTerm() {
  const v = manifest().vocabulary;
  const roll = Math.random();
  let term;
  if (roll < 0.55) term = pick(v.nouns).split(' ').slice(-1)[0];
  else if (roll < 0.7) term = pick(v.materials);
  else if (roll < 0.8) term = pick(v.colours);
  else if (roll < 0.9) term = pick(v.adjectives);
  else term = pick(v.nouns);
  if (chance(profile.search.multiWordShare)) term = `${term} ${pick(v.suffixes)}`;
  return term.toLowerCase();
}

export function buyerEmail(vu) {
  const m = manifest();
  if (chance(profile.shopper.powerUserShare) && m.powerBuyers.length) return m.powerBuyers[vu % m.powerBuyers.length].email;
  return m.buyers[(vu * 7919) % m.buyers.length];
}

export function sellerFor(vu) {
  const m = manifest();
  if (m.bigSellers.length && (vu % 100) / 100 < profile.seller.bigSellerShare) return m.bigSellers[vu % m.bigSellers.length];
  return m.otherSellers[(vu * 31) % m.otherSellers.length] || m.bigSellers[0];
}

export function isoDaysAgo(days) {
  return new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
}

export const address = (name) => ({
  fullName: name,
  line1: `${rand(1, 200)} Galle Road`,
  city: pick(['Colombo', 'Kandy', 'Galle', 'London', 'Berlin', 'Melbourne']),
  postalCode: String(rand(10000, 99999)),
  country: pick(['LK', 'LK', 'GB', 'DE', 'AU']),
  phone: null,
});
