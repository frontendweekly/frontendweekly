import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import dateISO from './date-iso.js';

describe('dateISO', () => {
  beforeEach(() => {
    // Mock Date.now() to return a fixed timestamp
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2020, 3, 1, 0, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('it should output date in ISO format', () => {
    // Arrange
    const date = Date.now();
    // Act
    const actual = dateISO(date);
    // Assert
    const expected = `2020-04-01T00:00:00.000Z`;
    expect(actual).toEqual(expected);
  });
}); 