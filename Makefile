.PHONY: format format-check lint typecheck test

format:
	deno fmt

format-check:
	deno fmt --check

lint:
	deno lint

typecheck:
	deno check --unstable-raw-imports src/**/* test/**/*

test:
	deno test --unstable-raw-imports