/**
 * Auth test fixture - Wrong order case
 * Steps are in the wrong order
 */

import { describe, it, expect } from 'vitest';

describe('Auth', () => {
  it('should login successfully', () => {
    // step("Validate input parameters")
    const username = 'testuser';
    const password = 'testpass';
    expect(username).toBeDefined();
    expect(password).toBeDefined();

    // step("Verify password hash")  // WRONG ORDER - should be after "Check user exists"
    const passwordValid = true;
    expect(passwordValid).toBe(true);

    // step("Check user exists in database")  // WRONG ORDER - should be before "Verify password"
    const userExists = true;
    expect(userExists).toBe(true);

    // step("Create session token")
    const token = 'abc123';
    expect(token).toBeTruthy();
  });
});
