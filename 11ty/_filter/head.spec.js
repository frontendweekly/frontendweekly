import { describe, expect, test } from 'vitest';
import SUT from './head.js';

describe('filter-head', () => {
  test('should return first 3 items from an array', () => {
    // Arrange
    const array = [0, 1, 2, 3, 4, 5];
    // Act
    const actual = SUT(array, 3);
    // Assert
    expect(actual).toEqual([0, 1, 2]);
  });

  test('should return first 2 items from an array', () => {
    // Arrange
    const array = ['a', 'b', 'c', 'd'];
    // Act
    const actual = SUT(array, 2);
    // Assert
    expect(actual).toEqual(['a', 'b']);
  });

  test('should return all items when n is larger than array length', () => {
    // Arrange
    const array = [1, 2, 3];
    // Act
    const actual = SUT(array, 5);
    // Assert
    expect(actual).toEqual([1, 2, 3]);
  });

  test('should return empty array when n is 0', () => {
    // Arrange
    const array = [1, 2, 3, 4, 5];
    // Act
    const actual = SUT(array, 0);
    // Assert
    expect(actual).toEqual([]);
  });

  test('should handle negative numbers by returning last n items', () => {
    // Arrange
    const array = [1, 2, 3, 4, 5];
    // Act
    const actual = SUT(array, -2);
    // Assert
    expect(actual).toEqual([4, 5]);
  });

  test('should handle negative numbers larger than array length', () => {
    // Arrange
    const array = [1, 2, 3];
    // Act
    const actual = SUT(array, -5);
    // Assert
    expect(actual).toEqual([1, 2, 3]);
  });

  test('should return undefined when value is not an array', () => {
    // Arrange
    const value = 'not an array';
    // Act
    const actual = SUT(value, 3);
    // Assert
    expect(actual).toBeUndefined();
  });

  test('should return undefined when value is null', () => {
    // Arrange
    const value = null;
    // Act
    const actual = SUT(value, 3);
    // Assert
    expect(actual).toBeUndefined();
  });

  test('should return undefined when value is undefined', () => {
    // Arrange
    const value = undefined;
    // Act
    const actual = SUT(value, 3);
    // Assert
    expect(actual).toBeUndefined();
  });

  test('should return undefined when value is a number', () => {
    // Arrange
    const value = 42;
    // Act
    const actual = SUT(value, 3);
    // Assert
    expect(actual).toBeUndefined();
  });

  test('should return undefined when value is an object', () => {
    // Arrange
    const value = { key: 'value' };
    // Act
    const actual = SUT(value, 3);
    // Assert
    expect(actual).toBeUndefined();
  });

  test('should return undefined when array is empty', () => {
    // Arrange
    const array = [];
    // Act
    const actual = SUT(array, 3);
    // Assert
    expect(actual).toBeUndefined();
  });

  test('should handle array with single item and positive n', () => {
    // Arrange
    const array = ['single'];
    // Act
    const actual = SUT(array, 1);
    // Assert
    expect(actual).toEqual(['single']);
  });

  test('should handle array with single item and negative n', () => {
    // Arrange
    const array = ['single'];
    // Act
    const actual = SUT(array, -1);
    // Assert
    expect(actual).toEqual(['single']);
  });

  test('should handle array with mixed types', () => {
    // Arrange
    const array = [1, 'string', { obj: true }, [1, 2, 3]];
    // Act
    const actual = SUT(array, 2);
    // Assert
    expect(actual).toEqual([1, 'string']);
  });

  test('should handle array with null and undefined values', () => {
    // Arrange
    const array = [null, undefined, 'value', 42];
    // Act
    const actual = SUT(array, 3);
    // Assert
    expect(actual).toEqual([null, undefined, 'value']);
  });

  test('should handle negative zero', () => {
    // Arrange
    const array = [1, 2, 3, 4, 5];
    // Act
    const actual = SUT(array, -0);
    // Assert
    expect(actual).toEqual([]);
  });

  test('should handle very large positive numbers', () => {
    // Arrange
    const array = [1, 2, 3];
    // Act
    const actual = SUT(array, 1000000);
    // Assert
    expect(actual).toEqual([1, 2, 3]);
  });

  test('should handle very large negative numbers', () => {
    // Arrange
    const array = [1, 2, 3];
    // Act
    const actual = SUT(array, -1000000);
    // Assert
    expect(actual).toEqual([1, 2, 3]);
  });
});
