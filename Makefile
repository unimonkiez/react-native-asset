.PHONY: format format-check lint typecheck test

fmt:
	deno fmt

fmt-check:
	deno fmt --check

lint:
	deno lint

check:
	deno check --unstable-raw-imports src/**/* test/**/*

test:
	deno test --unstable-raw-imports
