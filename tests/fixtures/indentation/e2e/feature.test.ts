/**
 * Test file for indentation fixture
 */

import { describe, it, expect } from 'vitest';

describe('Feature with Multiple Scenarios', () => {
  describe('First Scenario', () => {
    it('validates first scenario', () => {
      // step("Step one of first scenario")
      expect(true).toBe(true);
      
      // step("Step two of first scenario")
      expect(true).toBe(true);
    });
  });

  describe('Second Scenario', () => {
    it('validates second scenario', () => {
      // step("Step one of second scenario")
      expect(true).toBe(true);
      
      // step("Step two of second scenario")
      expect(true).toBe(true);
      
      // step("Step three of second scenario")
      expect(true).toBe(true);
    });
  });

  describe('Third Scenario', () => {
    it('validates third scenario', () => {
      // step("Step one of third scenario")
      expect(true).toBe(true);
    });
  });
});
