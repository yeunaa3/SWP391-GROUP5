#!/bin/sh
# Used by the Linux Docker build. No extra tool or package is needed.
set -eu

attempt=1
while [ "$attempt" -le 4 ]; do
    if mvn -B -U -Dmaven.artifact.threads=1 "$@"; then
        exit 0
    fi

    if [ "$attempt" -eq 4 ]; then
        echo "Maven failed after 4 attempts." >&2
        exit 1
    fi

    delay=$((attempt * 30))
    echo "Maven build failed; retrying in ${delay}s (attempt ${attempt}/4)." >&2
    sleep "$delay"
    attempt=$((attempt + 1))
done
