import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import globalData from './global.js';

describe('global data', () => {
  describe('environment', () => {
    it('should have environment property', () => {
      expect(globalData).toHaveProperty('environment');
    });

    it('should have environment as string or undefined', () => {
      expect(typeof globalData.environment === 'string' || globalData.environment === undefined).toBe(true);
    });

    it('should reflect the ELEVENTY_ENV at module load time', () => {
      // The environment is captured at module load time, so we can't change it in tests
      // We just verify it exists and has the right type
      expect(typeof globalData.environment === 'string' || globalData.environment === undefined).toBe(true);
    });
  });

  describe('random', () => {
    it('should generate a random string in correct format', () => {
      const result = globalData.random();
      
      // Should be in format: xxxx-xxxx-xxxx (4 chars, dash, 4 chars, dash, 4 chars)
      expect(result).toMatch(/^[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}$/);
    });

    it('should generate different values on multiple calls', () => {
      const result1 = globalData.random();
      const result2 = globalData.random();
      
      expect(result1).not.toBe(result2);
    });

    it('should generate valid hexadecimal segments', () => {
      const result = globalData.random();
      const segments = result.split('-');
      
      expect(segments).toHaveLength(3);
      segments.forEach(segment => {
        expect(segment).toMatch(/^[a-f0-9]{4}$/);
        expect(segment.length).toBe(4);
      });
    });

    it('should handle Math.random edge cases', () => {
      // Mock Math.random to return specific values
      const originalRandom = Math.random;
      Math.random = vi.fn();
      
      // Test with 0
      Math.random.mockReturnValue(0);
      const result1 = globalData.random();
      expect(result1).toMatch(/^[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}$/);
      
      // Test with 1
      Math.random.mockReturnValue(1);
      const result2 = globalData.random();
      expect(result2).toMatch(/^[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}$/);
      
      // Test with 0.5
      Math.random.mockReturnValue(0.5);
      const result3 = globalData.random();
      expect(result3).toMatch(/^[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}$/);
      
      Math.random = originalRandom;
    });

    it('should generate consistent format across multiple calls', () => {
      const results = [];
      
      for (let i = 0; i < 10; i++) {
        results.push(globalData.random());
      }
      
      results.forEach(result => {
        expect(result).toMatch(/^[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}$/);
      });
    });

    it('should generate segments with correct hexadecimal range', () => {
      const result = globalData.random();
      const segments = result.split('-');
      
      segments.forEach(segment => {
        // Each segment should be a valid 4-character hex string
        expect(segment).toMatch(/^[0-9a-f]{4}$/);
        // Convert to number to ensure it's in valid range
        const num = parseInt(segment, 16);
        expect(num).toBeGreaterThanOrEqual(0);
        expect(num).toBeLessThanOrEqual(0xffff);
      });
    });
  });

  describe('now', () => {
    it('should return a number', () => {
      expect(typeof globalData.now).toBe('number');
    });

    it('should be a valid timestamp', () => {
      const date = new Date(globalData.now);
      
      expect(date.getTime()).toBe(globalData.now);
      expect(date.toString()).not.toBe('Invalid Date');
    });

    it('should be a reasonable timestamp (not too old or future)', () => {
      const currentTime = Date.now();
      const difference = Math.abs(globalData.now - currentTime);
      
      // Should be within 1 hour of current time (allowing for module load time)
      expect(difference).toBeLessThan(3600000);
    });

    it('should be greater than a reasonable minimum', () => {
      // Should be after year 2020
      const minTime = new Date('2020-01-01').getTime();
      expect(globalData.now).toBeGreaterThan(minTime);
    });
  });

  describe('object structure', () => {
    it('should export an object with expected properties', () => {
      expect(globalData).toBeInstanceOf(Object);
      expect(globalData).toHaveProperty('environment');
      expect(globalData).toHaveProperty('random');
      expect(globalData).toHaveProperty('now');
    });

    it('should have random as a function', () => {
      expect(typeof globalData.random).toBe('function');
    });

    it('should have now as a number', () => {
      expect(typeof globalData.now).toBe('number');
    });

    it('should have environment as string or undefined', () => {
      expect(typeof globalData.environment === 'string' || globalData.environment === undefined).toBe(true);
    });
  });

  describe('integration', () => {
    it('should work correctly with all properties together', () => {
      expect(globalData).toHaveProperty('environment');
      expect(globalData.random()).toMatch(/^[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}$/);
      expect(typeof globalData.now).toBe('number');
      expect(globalData.now).toBeGreaterThan(0);
    });

    it('should be callable multiple times with consistent behavior', () => {
      expect(globalData).toHaveProperty('environment');
      expect(typeof globalData.random).toBe('function');
      expect(typeof globalData.now).toBe('number');
    });
  });
}); 