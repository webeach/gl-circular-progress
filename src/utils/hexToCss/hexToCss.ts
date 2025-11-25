/**
 * Converts a hexadecimal color number to a CSS color string.
 *
 * @param hex - The hexadecimal color number (e.g., 0xFF5733).
 * @returns The CSS color string in #RRGGBB format.
 *
 * @example
 * const cssColor = hexToCss(0xFF5733);
 * // Returns '#ff5733'
 *
 * @example
 * const cssColor = hexToCss(0x0000FF);
 * // Returns '#0000ff'
 */
export function hexToCss(hex: number): string {
  return '#' + hex.toString(16).padStart(6, '0');
}
