/**
 * Options for the BaseCircularProgress class.
 */
export type BaseCircularProgressOptions = {
  /**
   * Array of colors in hex format (e.g., 0x000000).
   * Used for gradients or solid colors.
   * @default [0x000000]
   */
  readonly colors: readonly [number, ...number[]];

  /**
   * The initial progress value (0.0 to 1.0).
   * @default 0
   */
  readonly progress?: number;

  /**
   * Whether the progress should fill in the reverse direction.
   * @default false
   */
  readonly reversed?: boolean;

  /**
   * The animation speed or flow speed.
   * Arbitrary unit depending on implementation.
   * @default 1.0
   */
  readonly speed?: number;

  /**
   * The starting angle of the progress in degrees.
   * 0 is usually the top or right depending on implementation.
   * @default 0
   */
  readonly startAngle?: number;

  /**
   * The thickness of the progress ring in pixels.
   * Relative to the canvas size.
   * @default 10
   */
  readonly thickness?: number;
};
