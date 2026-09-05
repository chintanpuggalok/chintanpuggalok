#!/usr/bin/env sh
set -eu

# workerd has no Android build. Wrangler still imports it for cloud-only
# commands, so preload a metadata shim on Termux. Supported desktop/CI systems
# use Wrangler normally.
if [ "$(node -p 'process.platform')" = "android" ]; then
  shim="$PWD/scripts/termux-wrangler.cjs"
  if [ -n "${NODE_OPTIONS:-}" ]; then
    export NODE_OPTIONS="$NODE_OPTIONS --require=$shim"
  else
    export NODE_OPTIONS="--require=$shim"
  fi
fi

wrangler_bin="$PWD/node_modules/.bin/wrangler"
if [ ! -x "$wrangler_bin" ]; then
  wrangler_bin="$(command -v wrangler)"
fi

exec "$wrangler_bin" "$@"
