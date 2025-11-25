import { Mutable } from '../../types/core';

import {
  DEFAULT_REVERSED,
  DEFAULT_SPEED,
  DEFAULT_START_ANGLE,
  DEFAULT_THICKNESS,
} from './constants';

import type { BaseCircularProgressOptions } from './types';

/**
 * Abstract base class for circular progress indicators.
 * Handles common state and lifecycle management.
 */
export abstract class BaseCircularProgress {
  protected readonly state: Required<Mutable<BaseCircularProgressOptions>>;

  protected canvas: HTMLCanvasElement;
  protected canvasHeight: number = 0;
  protected canvasWidth: number = 0;
  protected dpr: number = 1;
  protected isDestroyed: boolean = false;
  protected resizeObserver: ResizeObserver | null = null;

  /**
   * Creates an instance of BaseCircularProgress.
   *
   * @param canvas - The HTMLCanvasElement to render on.
   * @param options - Configuration options.
   */
  protected constructor(
    canvas: HTMLCanvasElement,
    options: BaseCircularProgressOptions,
  ) {
    this.canvas = canvas;
    this.dpr = window.devicePixelRatio;

    this.state = {
      colors: [...options.colors],
      progress: options.progress ?? 0,
      reversed: options.reversed ?? DEFAULT_REVERSED,
      speed: options.speed ?? DEFAULT_SPEED,
      startAngle: options.startAngle ?? DEFAULT_START_ANGLE,
      thickness: options.thickness ?? DEFAULT_THICKNESS,
    };

    this.handleResize = this.handleResize.bind(this);

    this.resizeObserver = new ResizeObserver(this.handleResize);
    this.resizeObserver.observe(this.canvas);

    window.addEventListener('resize', this.handleResize);
  }

  /**
   * Cleans up resources, event listeners, and stops animations.
   * Must be called when the instance is no longer needed.
   */
  public destroy(): void {
    this.isDestroyed = true;

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    window.removeEventListener('resize', this.handleResize);
  }

  /**
   * Gets the current colors array.
   */
  public get colors(): [number, ...number[]] {
    return [...this.state.colors];
  }

  /**
   * Sets the colors array and updates rendering.
   */
  public set colors(value: readonly [number, ...number[]]) {
    this.state.colors = [...value];
    this.updateColors();
  }

  /**
   * Gets the current progress value.
   */
  public get progress(): number {
    return this.state.progress;
  }

  /**
   * Sets the progress value.
   */
  public set progress(value: number) {
    const clamped = Math.max(0, Math.min(1, value));
    this.state.progress = clamped;
    this.updateProgress(clamped);
  }

  /**
   * Gets whether the progress fills in reverse direction.
   */
  public get reversed(): boolean {
    return this.state.reversed;
  }

  /**
   * Sets the reverse direction flag and updates rendering.
   */
  public set reversed(value: boolean) {
    this.state.reversed = value;
    this.updateReversed();
  }

  /**
   * Gets the current animation speed.
   */
  public get speed(): number {
    return this.state.speed;
  }

  /**
   * Sets the animation speed and updates rendering.
   */
  public set speed(value: number) {
    this.state.speed = value;
    this.updateSpeed();
  }

  /**
   * Gets the current start angle in degrees.
   */
  public get startAngle(): number {
    return this.state.startAngle;
  }

  /**
   * Sets the start angle and updates rendering.
   */
  public set startAngle(value: number) {
    this.state.startAngle = value;
    this.updateStartAngle();
  }

  /**
   * Gets the current thickness in pixels.
   */
  public get thickness(): number {
    return this.state.thickness;
  }

  /**
   * Sets the thickness and updates rendering.
   */
  public set thickness(value: number) {
    this.state.thickness = value;
    this.updateThickness();
  }
  /**
   * Handles canvas resize events from ResizeObserver.
   * Updates canvas dimensions with devicePixelRatio and calls resize().
   */
  protected handleResize(): void {
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = this.canvas.clientWidth;
    const displayHeight = this.canvas.clientHeight;

    this.canvasWidth = Math.floor(displayWidth * dpr);
    this.canvasHeight = Math.floor(displayHeight * dpr);
    this.dpr = dpr;

    if (
      this.canvas.width !== this.canvasWidth ||
      this.canvas.height !== this.canvasHeight
    ) {
      this.canvas.width = this.canvasWidth;
      this.canvas.height = this.canvasHeight;
    }

    this.resize();
  }

  /**
   * Handles rendering updates when canvas is resized.
   * Should be implemented by subclasses to adjust WebGL viewport and uniforms.
   */
  protected abstract resize(): void;

  /**
   * Updates WebGL uniforms when colors change.
   * Should regenerate gradient textures or update color uniforms.
   */
  protected abstract updateColors(): void;

  /**
   * Updates the progress value.
   *
   * @param value - The new progress value (0.0 to 1.0).
   */
  protected abstract updateProgress(value: number): void;

  /**
   * Updates WebGL uniforms when direction changes.
   */
  protected abstract updateReversed(): void;

  /**
   * Updates WebGL uniforms when speed changes.
   */
  protected abstract updateSpeed(): void;

  /**
   * Updates WebGL uniforms when start angle changes.
   */
  protected abstract updateStartAngle(): void;

  /**
   * Updates WebGL uniforms when thickness changes.
   */
  protected abstract updateThickness(): void;
}
