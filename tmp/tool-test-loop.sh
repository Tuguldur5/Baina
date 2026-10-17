#!/bin/bash
for i in $(seq 1 40); do
  EMAIL="verify-admin-tool-$(date +%s)-$i@example.com"
  echo "=== attempt $i: $EMAIL ==="
  if ! node tmp/mk-user.mjs "$EMAIL" 2>&1; then echo "mk-user failed"; sleep 45; continue; fi
  if ! node scripts/make-admin.mjs "$EMAIL" 2>&1; then echo "make-admin failed"; sleep 45; continue; fi
  if ! node scripts/list-admins.mjs 2>&1; then echo "list-admins failed"; sleep 45; continue; fi
  if ! node scripts/cleanup-fixtures.mjs 2>&1; then echo "cleanup failed"; sleep 45; continue; fi
  echo "TOOL_TEST_OK"; exit 0
done
echo "TOOL_TEST_GAVE_UP"; exit 1
