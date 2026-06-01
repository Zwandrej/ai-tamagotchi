/**
 * Deep clone helper — JSON-based fallback for Hermes compatibility.
 * structuredClone is not available in all Hermes builds.
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}
