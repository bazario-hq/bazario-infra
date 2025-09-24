# Load generator

Synthetic traffic for Bazario, written for [k6](https://k6.io). The same
scenarios drive continuous "production" traffic in prod-sim and on-demand load
tests in staging.

## Before the first run

The journeys log in as seeded accounts and pick real products, so the
environment needs a dataset and its manifest:

    make seed ENV=staging        # writes loadgen/data/manifest.staging.json

## Running

    make load ENV=prod-sim                                  # mixed traffic, 24 h
    make load ENV=prod-sim TRAFFIC_MULTIPLIER=3             # a busy day
    make load ENV=staging LOAD_SCENARIO=smoke               # every journey a few times
    make load ENV=staging LOAD_SCENARIO=month-end DURATION=15m

k6 results stream to Prometheus (`k6_*` metrics) in staging and prod-sim and
show up next to the API metrics in Grafana. The summary prints when the run ends.

| Scenario | What it models |
| --- | --- |
| `mixed` | Continuous production traffic: every journey at once, following a daily curve with short bursts |
| `smoke` | Each journey a few times with one user; a quick check that load generator, data and API agree |
| `login-burst` | A marketing email: a wave of sign-ins while browsing continues |
| `crawler` | A bot walking category listings and product pages |
| `month-end` | Big sellers watching month-to-date numbers while finance pulls quarter exports |
| `search` | Search-heavy traffic, including typing into the refine box |

## Traffic model

`profile.json` holds the traffic model: journeys per minute at
`TRAFFIC_MULTIPLIER=1`, the shape of a day, bursts, and behaviour mixes (how
often sellers open payouts, what share of visitors page deep into a category,
and so on). One simulated day lasts `simulatedDayMinutes` of real time, so a
session of a few hours sees several daily peaks.

Useful overrides (environment variables):

| Variable | Effect |
| --- | --- |
| `TRAFFIC_MULTIPLIER` | Scales every journey rate |
| `DURATION_HOURS` | Length of a `mixed` run (default from the profile) |
| `DURATION` | Length of the focused scenarios, e.g. `15m` |
| `SIM_START_HOUR` | Simulated hour of day the run starts at (default 8) |
| `JOURNEY_RATE_<NAME>` | Override one journey's rate per minute, e.g. `JOURNEY_RATE_SEARCH=10` (k6 `-e` flag when running k6 directly) |

Update the profile when production traffic changes, and note the source in the
commit message.

## Running k6 directly

    k6 run -e BASE_URL=http://localhost:3100 \
      -e MANIFEST=loadgen/data/manifest.staging.json -e PROFILE=loadgen/profile.json \
      loadgen/scenarios/smoke.js

## Layout

    profile.json            traffic model
    scenarios/*.js          runnable scenarios
    scenarios/lib/          journeys, request helpers, schedule builder
    data/                   seed manifests written by `make seed` (not committed)
