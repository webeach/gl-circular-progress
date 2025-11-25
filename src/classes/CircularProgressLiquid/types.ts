import type { BaseCircularProgressOptions } from '../BaseCircularProgress';

/**
 * Options for the CircularProgressLiquid class.
 */
export type CircularProgressLiquidOptions = BaseCircularProgressOptions & {
  /**
   * Volume (3D/Lens effect) intensity.
   * Value usually between 0.0 (flat) and 1.0 (strong effect).
   * @default 0
   */
  volume?: number;
};
