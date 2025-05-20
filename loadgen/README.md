# Load generator

k6 scenarios live in `scenarios/` and run through the `load` compose profile:

    make load ENV=prod-sim LOAD_SCENARIO=mixed TRAFFIC_MULTIPLIER=1

Scenarios are added alongside the seed data work.
