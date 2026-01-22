#!/usr/bin/env bash

# E2E tests for specguard.sh

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

# Counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Test helper
assert_exit_code() {
    local expected=$1
    local actual=$2
    local test_name=$3
    
    ((TESTS_RUN++))
    
    if [[ $expected -eq $actual ]]; then
        echo -e "${GREEN}✓${NC} $test_name"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}✗${NC} $test_name (expected exit code $expected, got $actual)"
        ((TESTS_FAILED++))
        return 1
    fi
}

assert_output_contains() {
    local expected=$1
    local output=$2
    local test_name=$3
    
    ((TESTS_RUN++))
    
    if echo "$output" | grep -q "$expected"; then
        echo -e "${GREEN}✓${NC} $test_name"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}✗${NC} $test_name (output doesn't contain: $expected)"
        ((TESTS_FAILED++))
        return 1
    fi
}

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"
SPECGUARD="$PROJECT_ROOT/src/specguard.sh"

echo "Running E2E tests for specguard"
echo "================================"
echo ""

# Test 1: Success case
echo "Test Suite: Success Case"
echo "------------------------"
# step("Run specguard against success fixture")
output=$(cd "$PROJECT_ROOT" && "$SPECGUARD" --specguard-folder-name specs tests/fixtures/success 2>&1) || exit_code=$?
exit_code=${exit_code:-0}

# step("Assert exit code is 0 for passing tests")
assert_exit_code 0 $exit_code "Success fixture should exit with 0"

# step("Assert output contains passed test file")
assert_output_contains "tests/fixtures/success/unit/auth.sh" "$output" "Output should show test file path"

# step("Assert summary shows 1 passed test")
assert_output_contains "Passed:.*1" "$output" "Summary should show 1 passed"

echo ""

# Test 2: Missing steps case
echo "Test Suite: Missing Steps"
echo "-------------------------"
# step("Run specguard against missing-steps fixture")
output=$(cd "$PROJECT_ROOT" && "$SPECGUARD" --specguard-folder-name specs tests/fixtures/missing-steps 2>&1) || exit_code=$?
exit_code=${exit_code:-0}

# step("Assert exit code is 1 for failing tests")
assert_exit_code 1 $exit_code "Missing steps fixture should exit with 1"

# step("Assert output indicates steps mismatch")
assert_output_contains "steps mismatch" "$output" "Output should indicate steps mismatch"

# step("Assert summary shows 1 failed test")
assert_output_contains "Failed:.*1" "$output" "Summary should show 1 failed"

echo ""

# Test 3: Wrong order case
echo "Test Suite: Wrong Order"
echo "-----------------------"
# step("Run specguard against wrong-order fixture")
output=$(cd "$PROJECT_ROOT" && "$SPECGUARD" --specguard-folder-name specs tests/fixtures/wrong-order 2>&1) || exit_code=$?
exit_code=${exit_code:-0}

# step("Assert exit code is 1 for failing tests")
assert_exit_code 1 $exit_code "Wrong order fixture should exit with 1"

# step("Assert output indicates steps mismatch")
assert_output_contains "steps mismatch" "$output" "Output should indicate steps mismatch"

echo ""

# Test 4: Missing file case  
echo "Test Suite: Missing File"
echo "------------------------"
# step("Run specguard against missing-file fixture")
output=$(cd "$PROJECT_ROOT" && "$SPECGUARD" --specguard-folder-name specs tests/fixtures/missing-file 2>&1) || exit_code=$?
exit_code=${exit_code:-0}

# step("Assert exit code is 1 for missing implementation")
assert_exit_code 1 $exit_code "Missing file fixture should exit with 1"

# step("Assert output indicates not implemented")
assert_output_contains "not implemented" "$output" "Output should indicate not implemented"

# step("Assert summary shows 1 not implemented")
assert_output_contains "Not implemented:.*1" "$output" "Summary should show 1 not implemented"

echo ""

# Test 5: Extra steps case
echo "Test Suite: Extra Steps"
echo "-----------------------"
# step("Run specguard against extra-steps fixture")
output=$(cd "$PROJECT_ROOT" && "$SPECGUARD" --specguard-folder-name specs tests/fixtures/extra-steps 2>&1) || exit_code=$?
exit_code=${exit_code:-0}

# step("Assert exit code is 1 for step count mismatch")
assert_exit_code 1 $exit_code "Extra steps fixture should exit with 1"

# step("Assert output indicates steps mismatch")
assert_output_contains "steps mismatch" "$output" "Output should indicate steps mismatch"

echo ""

# Print summary
echo "================================"
echo "E2E Test Summary"
echo "================================"
echo "Tests run:    $TESTS_RUN"
echo -e "${GREEN}Passed:${NC}       $TESTS_PASSED"
echo -e "${RED}Failed:${NC}       $TESTS_FAILED"
echo ""

if [[ $TESTS_FAILED -gt 0 ]]; then
    exit 1
fi

echo -e "${GREEN}All E2E tests passed!${NC}"
