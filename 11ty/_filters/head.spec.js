import { describe, test, expect } from 'vitest';
import SUT from './head.js';

describe('filter-head', () => {
  test('it should return 3 items from an array', () => {
    // Arrange
    const array = [0, 1, 2, 3, 4, 5];
    // Act
    const actual = SUT(array, 3);
    // Assert
    expect(actual).toContain(0);
    expect(actual).toContain(1);
    expect(actual).toContain(2);
  });

  test('it should do nothing value is not an array', () => {
    // Arrange
    const array = '0';
    // Act
    const actual = SUT(array, 3);
    // Assert
    const expected = undefined;
    expect(actual).toEqual(expected);
  });
}); 