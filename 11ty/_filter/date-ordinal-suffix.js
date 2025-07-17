/**
 * Adds ordinal suffix to a number (1st, 2nd, 3rd, etc.)
 * @param {number} n - Number to add suffix to
 * @returns {string} Number with ordinal suffix
 */
const appendSuffix = (n) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

/**
 * Formats a date with ordinal suffix (e.g., "1st January 2023")
 * @param {Date|string|number} value - Date value to format
 * @returns {string} Formatted date string with ordinal suffix
 */
export default function (value) {
  const dateObject = new Date(value);

  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  const dayWithSuffix = appendSuffix(dateObject.getDate());

  return `${dayWithSuffix} ${months[dateObject.getMonth()]} ${dateObject.getFullYear()}`;
}
