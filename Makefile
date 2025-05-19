ENV ?= dev
ENV_FILE := env/$(ENV).env
MONITORING ?= $(if $(filter dev,$(ENV)),0,1)
PROFILES := $(if $(filter 1,$(MONITORING)),--profile monitoring,)

COMPOSE_FILES := -f compose/base.yml -f compose/$(ENV).yml $(if $(filter dev,$(ENV)),,-f compose/limits.yml)
COMPOSE := docker compose --env-file $(ENV_FILE) $(COMPOSE_FILES) $(PROFILES)

.PHONY: help env up up-app down ps logs config psql latency reset deploy rollback

help:
	@echo "Usage: make <target> [ENV=dev|staging|prod-sim] [MONITORING=0|1]"
	@echo "  env        create env/\$$ENV.env from the example"
	@echo "  up         start backing services (and monitoring for staging/prod-sim)"
	@echo "  up-app     start backing services plus api and web"
	@echo "  down       stop the environment"
	@echo "  ps / logs  inspect the environment"
	@echo "  psql       open a psql shell"
	@echo "  latency    add network latency between api and its dependencies (MS=20)"
	@echo "  reset      stop and delete all volumes for the environment"
	@echo "  deploy     pull/build, run migrations, restart (TAG=<sha>)"
	@echo "  rollback   return to the previous deployed tag"

env:
	@test -f $(ENV_FILE) || cp env/$(ENV).env.example $(ENV_FILE)

$(ENV_FILE):
	@echo "Missing $(ENV_FILE). Run: make env ENV=$(ENV)"; exit 1

up: $(ENV_FILE)
	$(COMPOSE) up -d

up-app: $(ENV_FILE)
	$(COMPOSE) --profile app up -d --build

down: $(ENV_FILE)
	$(COMPOSE) --profile app down

ps: $(ENV_FILE)
	$(COMPOSE) --profile app ps

logs: $(ENV_FILE)
	$(COMPOSE) --profile app logs -f --tail=100 $(SERVICE)

config: $(ENV_FILE)
	$(COMPOSE) --profile app config

psql: $(ENV_FILE)
	$(COMPOSE) exec postgres sh -c 'psql -U $$POSTGRES_USER $$POSTGRES_DB'

latency: $(ENV_FILE)
	ENV=$(ENV) ./scripts/toxics.sh $(or $(MS),20)

reset: $(ENV_FILE)
	$(COMPOSE) --profile app down -v

deploy: $(ENV_FILE)
	ENV=$(ENV) TAG=$(TAG) ./scripts/deploy.sh

rollback: $(ENV_FILE)
	ENV=$(ENV) ./scripts/rollback.sh
