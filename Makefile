format:
	deno fmt
format-check:
	deno fmt --check
lint:
	deno lint
typecheck:
	deno check src/**/*
test:
	deno test --unstable-raw-imports