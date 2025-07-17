/**
 * Converts a date value to ISO string format
 * @param {Date|string|number} value - Date value to convert
 * @returns {string} ISO formatted date string
 */
export default function (value) {
  const dateObject = new Date(value);
  return dateObject.toISOString();
}
