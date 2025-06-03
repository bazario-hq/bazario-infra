// Thin HTTP layer: named requests (so k6 metrics group by endpoint, not URL),
// status checks and per-VU login sessions with silent token refresh.
import http from 'k6/http';
import { check } from 'k6';
import exec from 'k6/execution';
import { BASE_URL, manifest } from './env.js';

const JSON_HEADERS = { 'Content-Type': 'application/json' };
const REFRESH_AFTER_MS = 12 * 60 * 1000;

function params(name, token, extra = {}) {
  const headers = { ...(extra.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  return { ...extra, headers, tags: { name, ...(extra.tags || {}) } };
}

function verify(res, name, ok) {
  check(res, { [`${name} ok`]: (r) => ok.includes(r.status) });
  return res;
}

export function get(name, path, { token, ok = [200], ...extra } = {}) {
  return verify(http.get(`${BASE_URL}${path}`, params(name, token, extra)), name, ok);
}

export function send(method, name, path, body, { token, ok = [200, 201, 204], ...extra } = {}) {
  const res = http.request(method, `${BASE_URL}${path}`, body == null ? null : JSON.stringify(body), params(name, token, { ...extra, headers: JSON_HEADERS }));
  return verify(res, name, ok);
}

export function json(res) {
  try {
    return res.json();
  } catch (e) {
    return null;
  }
}

/** Fetches images the way a browser does after rendering a page (bodies discarded). */
export function images(urls, max) {
  const picked = urls.filter(Boolean).slice(0, max);
  if (picked.length === 0) return;
  const reqs = picked.map((url) => {
    const path = url.slice(url.indexOf('/images/'));
    return ['GET', `${BASE_URL}${path}`, null, { tags: { name: 'GET /images/*' }, responseType: 'none' }];
  });
  const responses = http.batch(reqs);
  for (const r of responses) check(r, { 'GET /images/* ok': (x) => x.status === 200 });
}

// --- sessions -------------------------------------------------------------

const sessions = {};

export function login(email, name = 'POST /api/auth/login') {
  const res = send('POST', name, '/api/auth/login', { email, password: manifest().password }, { ok: [200] });
  const body = json(res);
  if (!body || !body.accessToken) return null;
  return { email, token: body.accessToken, refresh: body.refreshToken, at: Date.now(), user: body.user };
}

/**
 * Returns a logged-in session for this VU (one account per VU, like a person who
 * stays signed in). Refreshes the access token before it expires.
 */
export function session(key, pickEmail) {
  const id = `${key}:${exec.vu.idInTest}`;
  let s = sessions[id];
  if (!s) {
    s = login(pickEmail(exec.vu.idInTest));
    if (!s) return null;
    sessions[id] = s;
  } else if (Date.now() - s.at > REFRESH_AFTER_MS) {
    const res = send('POST', 'POST /api/auth/refresh', '/api/auth/refresh', { refreshToken: s.refresh }, { ok: [200, 401] });
    const body = json(res);
    if (res.status === 200 && body) {
      s.token = body.accessToken;
      s.refresh = body.refreshToken;
      s.at = Date.now();
    } else {
      delete sessions[id];
      return session(key, pickEmail);
    }
  }
  return s;
}
