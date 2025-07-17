import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import dateWithOrdinalSuffixFilter from '../11ty/_filters/date-ordinal-suffix.js';

describe('filterDateWithOrdinalSuffix', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('it should add ordinal suffix st to given date', () => {
    // Arrange
    vi.setSystemTime(new Date(2020, 3, 1, 0, 0, 0));
    const date = Date.now();
    // Act
    const actual = dateWithOrdinalSuffixFilter(date);
    // Assert
    const expected = '1st April 2020';
    expect(actual).toEqual(expected);
  });

  test('it should add ordinal suffix nd to given date', () => {
    // Arrange
    vi.setSystemTime(new Date(2020, 3, 22, 0, 0, 0));
    const date = Date.now();
    // Act
    const actual = dateWithOrdinalSuffixFilter(date);
    // Assert
    const expected = '22nd April 2020';
    expect(actual).toEqual(expected);
  });

  test('it should add ordinal suffix rd to given date', () => {
    // Arrange
    vi.setSystemTime(new Date(2020, 3, 3, 0, 0, 0));
    const date = Date.now();
    // Act
    const actual = dateWithOrdinalSuffixFilter(date);
    // Assert
    const expected = '3rd April 2020';
    expect(actual).toEqual(expected);
  });

  test('it should add ordinal suffix th to given date', () => {
    // Arrange
    vi.setSystemTime(new Date(2020, 3, 29, 0, 0, 0));
    const date = Date.now();
    // Act
    const actual = dateWithOrdinalSuffixFilter(date);
    // Assert
    const expected = '29th April 2020';
    expect(actual).toEqual(expected);
  });
});
