/**
 * Returns the first n elements of an array, or last n elements if n is negative
 * @param {Array} value - Array to get elements from
 * @param {number} n - Number of elements to return (positive for first n, negative for last n)
 * @returns {Array|undefined} Array with n elements or undefined if input is invalid
 */
export default function (value, n) {
  if (!value || value.length === 0 || !Array.isArray(value)) {
    return;
  }

  if (n < 0) {
    return value.slice(n);
  }

  return value.slice(0, n);
}
