// Shared configuration: the traffic profile, the seed manifest and the target.
import { SharedArray } from 'k6/data';

export const BASE_URL = (__ENV.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
export const MULTIPLIER = Number(__ENV.TRAFFIC_MULTIPLIER || 1);

const profilePath = __ENV.PROFILE || '/loadgen/profile.json';
const manifestPath = __ENV.MANIFEST || '/loadgen/data/manifest.json';

export const profile = JSON.parse(open(profilePath));

// The manifest is written by the API's seed command (make seed). It lists the
// seeded accounts, big sellers and popular products the journeys use.
const manifestData = new SharedArray('manifest', () => [JSON.parse(open(manifestPath))]);
export function manifest() {
  return manifestData[0];
}

/** Profile values can be overridden per run, e.g. -e JOURNEY_RATE_SEARCH=10. */
export function rateFor(journey) {
  const override = __ENV[`JOURNEY_RATE_${journey.toUpperCase()}`];
  return override != null ? Number(override) : profile.journeysPerMinute[journey] || 0;
}
