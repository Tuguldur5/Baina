#!/bin/bash
# Retries db:apply until the flaky direct route lets it through (Phase 2 schema).
for i in $(seq 1 60); do
  echo "=== round $i $(date +%H:%M:%S) ===" >> tmp/apply.log
  if npm run db:apply >> tmp/apply.log 2>&1; then
    echo "APPLY_OK round $i" >> tmp/apply.log
    exit 0
  fi
  echo "round $i failed, waiting 60s" >> tmp/apply.log
  sleep 60
done
echo "APPLY_GAVE_UP" >> tmp/apply.log
exit 1
