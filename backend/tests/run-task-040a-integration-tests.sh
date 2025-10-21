#!/bin/bash
# TASK-040A Phase 1 Integration Testing Script
# This script runs comprehensive integration tests to verify TASK-040A Phase 1 implementation

echo "===================================="
echo "TASK-040A Phase 1 Integration Tests"
echo "===================================="
echo ""

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

run_test() {
    local test_name=$1
    local test_file=$2
    
    echo "Running: $test_name"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if npm test -- "$test_file" 2>&1 | grep -q "Tests:.*passed"; then
        echo -e "${GREEN}✓ PASSED${NC}: $test_name"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}✗ FAILED${NC}: $test_name"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    echo ""
}

# Core TASK-040A Tests
echo "1. Core Notification Settings Tests"
echo "------------------------------------"
run_test "Notification Settings (Phase 1)" "tests/notificationSettings.test.ts"

# Integration with TASK-040 (Message Processing)
echo "2. TASK-040 Integration Tests"
echo "------------------------------"
run_test "Message Processing Integration" "tests/messageProcessing.integration.test.ts"

# Integration with TASK-041 (Appointment Booking)
echo "3. TASK-041 Integration Tests"
echo "------------------------------"
run_test "Appointment Integration" "tests/appointment-integration.test.ts"
run_test "Appointment Scheduling" "tests/appointment-scheduling.test.ts"

# Related System Tests
echo "4. Related System Integration Tests"
echo "------------------------------------"
run_test "WhatsApp Message Routing" "tests/whatsappMessageRouting.test.ts"
run_test "Patient Integration" "tests/patients-integration.test.ts"
run_test "Organization Registration" "tests/organizationRegistration.test.ts"

# Multi-tenant Isolation (Critical for organization-scoped settings)
echo "5. Multi-Tenant Isolation Tests"
echo "--------------------------------"
run_test "Multi-Tenant Isolation" "tests/task032-multi-tenant-isolation-working.test.ts"

# Performance and Load Tests
echo "6. Performance Validation"
echo "-------------------------"
echo "Running concurrent notification settings lookups..."
npm test -- tests/notificationSettings.test.ts --testNamePattern="PERF"

# Summary
echo ""
echo "===================================="
echo "Integration Test Summary"
echo "===================================="
echo "Total Test Suites: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
if [ $FAILED_TESTS -gt 0 ]; then
    echo -e "${RED}Failed: $FAILED_TESTS${NC}"
else
    echo "Failed: 0"
fi
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✓ All integration tests passed!${NC}"
    echo "TASK-040A Phase 1 is ready for production."
    exit 0
else
    echo -e "${RED}✗ Some integration tests failed.${NC}"
    echo "Please review the failures above."
    exit 1
fi
