// Turns the profile's daily shape into k6 executor stages. One simulated day
// lasts `simulatedDayMinutes` of real time, so a long run sees many daily peaks.
import { MULTIPLIER, profile, rateFor } from './env.js';

const START_HOUR = Number(__ENV.SIM_START_HOUR || 8);

function shapeAt(realMinute) {
  const shape = profile.dailyShape;
  const hour = (START_HOUR + (realMinute / profile.simulatedDayMinutes) * 24) % 24;
  const h0 = Math.floor(hour);
  const frac = hour - h0;
  return shape[h0] * (1 - frac) + shape[(h0 + 1) % 24] * frac;
}

export function simulatedHourAt(realMinute) {
  return (START_HOUR + (realMinute / profile.simulatedDayMinutes) * 24) % 24;
}

function durationMinutes() {
  return Math.round(Number(__ENV.DURATION_HOURS || profile.durationHours) * 60);
}

/** ramping-arrival-rate scenario for a journey following the daily curve (and bursts). */
export function dailyArrival(journey, { exec, avgSeconds = 20, maxVUs = 100 } = {}) {
  const perMinute = rateFor(journey) * MULTIPLIER;
  if (perMinute <= 0) return null;
  const unit = perMinute >= 20 ? 1 : perMinute >= 2 ? 10 : 60;
  const minutes = durationMinutes();
  const burst = profile.bursts && profile.bursts.journeys.includes(journey) ? profile.bursts : null;
  const target = (m, factor = 1) => Math.max(0, Math.round(perMinute * unit * shapeAt(m) * factor));

  const stages = [];
  for (let m = 1; m <= minutes; m++) {
    if (burst && m % burst.everyMinutes === 0) {
      stages.push({ duration: '5s', target: target(m, burst.factor) });
      stages.push({ duration: `${burst.holdSeconds}s`, target: target(m, burst.factor) });
      stages.push({ duration: '5s', target: target(m) });
      stages.push({ duration: `${50 - burst.holdSeconds}s`, target: target(m) });
    } else {
      stages.push({ duration: '1m', target: target(m) });
    }
  }
  const peakPerSecond = (perMinute * Math.max(...profile.dailyShape) * (burst ? burst.factor : 1)) / 60;
  return {
    executor: 'ramping-arrival-rate',
    exec: exec || journey,
    startRate: target(0),
    timeUnit: `${unit}m`,
    preAllocatedVUs: Math.max(2, Math.ceil((perMinute / 60) * avgSeconds)),
    maxVUs: Math.max(5, Math.min(maxVUs, Math.ceil(peakPerSecond * avgSeconds * 2))),
    stages,
    gracefulStop: '30s',
  };
}

/** Open browser tabs polling the badge; the number of tabs follows the daily curve. */
export function dailyTabs(count, { exec = 'tab' } = {}) {
  const minutes = durationMinutes();
  const stages = [];
  for (let m = 1; m <= minutes; m++) stages.push({ duration: '1m', target: Math.max(1, Math.round(count * MULTIPLIER * shapeAt(m))) });
  return { executor: 'ramping-vus', exec, startVUs: Math.max(1, Math.round(count * MULTIPLIER * shapeAt(0))), stages, gracefulRampDown: '5s', gracefulStop: '5s' };
}

/** Short daily sign-in waves (email campaign at the same hour every simulated day). */
export function dailyLoginBursts({ exec = 'signIn' } = {}) {
  const lb = profile.loginBurst;
  if (!lb || !lb.enabled) return null;
  const total = durationMinutes() * 60;
  const hourSeconds = (profile.simulatedDayMinutes * 60) / 24;
  const daySeconds = profile.simulatedDayMinutes * 60;
  const rate = Math.round(lb.perSecond * MULTIPLIER);
  const stages = [];
  let cursor = 0;
  for (let t = (((lb.atSimulatedHour - START_HOUR + 24) % 24) * hourSeconds); t + lb.seconds + 10 <= total; t += daySeconds) {
    if (t > cursor) stages.push({ duration: `${Math.round(t - cursor)}s`, target: 0 });
    stages.push({ duration: '5s', target: rate });
    stages.push({ duration: `${lb.seconds}s`, target: rate });
    stages.push({ duration: '5s', target: 0 });
    cursor = t + lb.seconds + 10;
  }
  if (total > cursor) stages.push({ duration: `${Math.round(total - cursor)}s`, target: 0 });
  return { executor: 'ramping-arrival-rate', exec, startRate: 0, timeUnit: '1s', preAllocatedVUs: 10, maxVUs: Math.max(20, rate * 3), stages };
}

export function compact(scenarios) {
  const out = {};
  for (const [name, s] of Object.entries(scenarios)) if (s) out[name] = s;
  return out;
}
