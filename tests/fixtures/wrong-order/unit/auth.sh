#!/usr/bin/env bash

test_login() {
    # step("Validate input parameters")
    local username="testuser"
    local password="testpass"
    
    # step("Verify password hash")  # WRONG ORDER - should be after "Check user exists"
    local password_valid=true
    
    # step("Check user exists in database")  # WRONG ORDER - should be before "Verify password"
    local user_exists=true
    
    # step("Create session token")
    local token="abc123"
    
    echo "PASS: Login test"
}

test_login
