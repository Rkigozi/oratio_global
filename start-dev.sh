#!/bin/bash
# Convenience wrapper: start the web app dev server from anywhere in the repo.
exec "$(dirname "$0")/apps/web/scripts/start-dev.sh" "$@"
