// src/utils/capitalize.ts

/**
 * Formats a string for Wurder IDs:
 * - Removes special characters (only letters, numbers, underscores, spaces)
 * - Collapses multiple spaces into one
 * - Trims leading/trailing spaces
 * - Capitalizes each word
 */
export default function capitalize(str: string): string {
  if (!str) return "";
  return str
    .replace(/[^a-zA-Z0-9_ ]/g, "") // remove invalid characters
    .replace(/\s+/g, " ")           // collapse multiple spaces
    .trim()
    .split(" ")
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}
