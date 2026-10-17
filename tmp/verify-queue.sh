#!/bin/bash
# Wait for the tool test to settle, then run the full admin verification.
for i in $(seq 1 120); do
  if grep -q "TOOL_TEST_OK\|TOOL_TEST_GAVE_UP" tmp/tool-test.log 2>/dev/null; then break; fi
  sleep 15
done
# Always attempt a cleanup first so verify starts from a clean slate.
node scripts/cleanup-fixtures.mjs >> tmp/verify.log 2>&1
echo "=== admin:verify ===" >> tmp/verify.log
npm run admin:verify >> tmp/verify.log 2>&1
echo "VERIFY_EXIT=$?" >> tmp/verify.log
# Final sweep: no fixture may survive a failed run either.
node scripts/cleanup-fixtures.mjs >> tmp/verify.log 2>&1
echo "FINAL_CLEANUP_EXIT=$?" >> tmp/verify.log
echo "QUEUE_DONE" >> tmp/verify.log
