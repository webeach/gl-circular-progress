import { hexToCss } from '../../utils/hexToCss';
import { BaseCircularProgress } from '../BaseCircularProgress';

import fragmentShaderSource from './shaders/fragment.frag';
import vertexShaderSource from './shaders/vertex.vert';

import type { CircularProgressFireOptions } from './types';

/**
 * A circular progress indicator with a fire effect.
 * Uses WebGL 2.0 for rendering.
 *
 * @example
 * const instance = new CircularProgressFire(canvas, {
 *   colors: [0xff5a00, 0xff9a00],
 *   intensity: 1.0,
 *   progress: 0.5,
 *   speed: 1.5,
 *   thickness: 20,
 * });
 *
 * @see https://webeach.github.io/gl-circular-progress/CircularProgressFire.html - Live Demo
 * @see https://github.com/webeach/gl-circular-progress/blob/main/docs/en/CircularProgressFire.md - Documentation
 */
export class CircularProgressFire extends BaseCircularProgress {
  private readonly extraState: { intensity: number };

  private animationFrameId: number | null = null;
  private gl: WebGL2RenderingContext | null = null;
  private gradientTexture: WebGLTexture | null = null;
  private lastFrameTime: number = 0;
  private locations: {
    uGradientTexture: WebGLUniformLocation | null;
    uInnerRadius: WebGLUniformLocation | null;
    uIntensity: WebGLUniformLocation | null;
    uOuterRadius: WebGLUniformLocation | null;
    uProgress: WebGLUniformLocation | null;
    uResolution: WebGLUniformLocation | null;
    uReversed: WebGLUniformLocation | null;
    uStartAngle: WebGLUniformLocation | null;
    uTime: WebGLUniformLocation | null;
  } | null = null;
  private program: WebGLProgram | null = null;
  private targetProgress: number = 0.0;
  private time: number = 0.0;
  private visualProgress: number = 0.0;

  /**
   * Creates an instance of CircularProgressFire.
   *
   * @param canvas - The HTMLCanvasElement to render on.
   * @param options - Configuration options.
   */
  constructor(canvas: HTMLCanvasElement, options: CircularProgressFireOptions) {
    super(canvas, options);

    this.extraState = {
      intensity: options.intensity ?? 1.0,
    };

    this.targetProgress = this.state.progress;
    this.visualProgress = this.state.progress;

    this.animate = this.animate.bind(this);

    this.initWebGL();
    this.createGradientTexture();
    this.resize();
    this.startAnimation();
  }

  /**
   * Cleans up WebGL resources and stops animation.
   */
  public override destroy(): void {
    super.destroy();

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    if (this.gl) {
      if (this.program) {
        this.gl.deleteProgram(this.program);
      }
      if (this.gradientTexture) {
        this.gl.deleteTexture(this.gradientTexture);
      }
      // Note: We don't lose the context, but we clean up our resources
    }
  }

  /**
   * Gets the current intensity.
   */
  public get intensity(): number {
    return this.extraState.intensity;
  }

  /**
   * Sets the intensity and updates rendering.
   */
  public set intensity(value: number) {
    this.extraState.intensity = Math.max(0, value);
    this.updateIntensity();
  }

  /**
   * Handles resizing of the canvas and updates WebGL viewport.
   */
  protected resize(): void {
    if (!this.gl || !this.locations) {
      return;
    }

    this.gl.viewport(0, 0, this.canvasWidth, this.canvasHeight);
    this.gl.uniform2f(
      this.locations.uResolution,
      this.canvasWidth,
      this.canvasHeight,
    );
  }

  /**
   * Updates WebGL uniforms when colors change.
   */
  protected updateColors(): void {
    this.createGradientTexture();
  }

  /**
   * Creates the gradient texture from the colors option.
   */
  private createGradientTexture(): void {
    if (!this.gl) {
      return;
    }

    if (this.gradientTexture) {
      this.gl.deleteTexture(this.gradientTexture);
    }

    this.gradientTexture = this.gl.createTexture();
    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.gradientTexture);
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_WRAP_S,
      this.gl.CLAMP_TO_EDGE,
    );
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_WRAP_T,
      this.gl.CLAMP_TO_EDGE,
    );
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_MIN_FILTER,
      this.gl.LINEAR,
    );
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_MAG_FILTER,
      this.gl.LINEAR,
    );

    // Create gradient on a temporary 2D canvas
    const gradientCanvas = document.createElement('canvas');
    gradientCanvas.width = 256;
    gradientCanvas.height = 1;
    const ctx = gradientCanvas.getContext('2d');

    if (ctx) {
      const grad = ctx.createLinearGradient(0, 0, 256, 0);
      const { colors } = this.state;

      if (colors.length === 1) {
        const color = hexToCss(colors[0]);
        grad.addColorStop(0, color);
        grad.addColorStop(1, color);
      } else {
        colors.forEach((hex: number, index: number) => {
          const stop = index / (colors.length - 1);
          grad.addColorStop(stop, hexToCss(hex));
        });
      }

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 1);

      this.gl.texImage2D(
        this.gl.TEXTURE_2D,
        0,
        this.gl.RGBA,
        this.gl.RGBA,
        this.gl.UNSIGNED_BYTE,
        gradientCanvas,
      );
    }
  }

  protected updateIntensity(): void {
    if (!this.gl || !this.locations) {
      return;
    }
    this.gl.uniform1f(this.locations.uIntensity, this.extraState.intensity);
  }

  /**
   * Updates the progress value.
   *
   * @param value - The new progress value (0.0 to 1.0).
   */
  protected updateProgress(value: number): void {
    this.targetProgress = value;
  }

  /**
   * Updates WebGL uniforms when direction changes.
   */
  protected updateReversed(): void {
    if (!this.gl || !this.locations) {
      return;
    }
    this.gl.uniform1f(
      this.locations.uReversed,
      this.state.reversed ? 1.0 : 0.0,
    );
  }

  /**
   * Updates WebGL uniforms when speed changes.
   */
  protected updateSpeed(): void {
    // Speed is used in animate loop
  }

  /**
   * Updates WebGL uniforms when start angle changes.
   */
  protected updateStartAngle(): void {
    if (!this.gl || !this.locations) {
      return;
    }
    const startAngleRad = this.state.startAngle * (Math.PI / 180.0);
    this.gl.uniform1f(this.locations.uStartAngle, startAngleRad);
  }

  /**
   * Updates WebGL uniforms when thickness changes.
   */
  protected updateThickness(): void {
    // Thickness handled in animate loop
  }

  /**
   * The main animation loop.
   */
  private animate(time: number): void {
    if (this.isDestroyed || !this.gl || !this.locations) {
      return;
    }

    if (!this.lastFrameTime) {
      this.lastFrameTime = time;
    }
    const deltaTime = (time - this.lastFrameTime) * 0.001;
    this.lastFrameTime = time;

    // Update State
    this.time += deltaTime * this.state.speed;

    const diff = this.targetProgress - this.visualProgress;
    // Smooth interpolation
    this.visualProgress += diff * 0.1;

    // Render
    this.gl.uniform1f(this.locations.uTime, this.time);
    this.gl.uniform1f(this.locations.uProgress, this.visualProgress);

    // Ensure these are set every frame or when changed
    this.updateReversed();
    this.updateStartAngle();
    this.updateIntensity();

    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.gradientTexture);
    this.gl.uniform1i(this.locations.uGradientTexture, 0);

    // Radius calculations
    const radiusPx = Math.min(this.canvasWidth, this.canvasHeight) / 2;
    const outerR = 0.95; // Margin for flame tips
    const thicknessRatio = (this.state.thickness * this.dpr) / radiusPx;
    const innerR = outerR - thicknessRatio;

    this.gl.uniform1f(this.locations.uOuterRadius, outerR);
    this.gl.uniform1f(this.locations.uInnerRadius, Math.max(0.0, innerR));

    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);

    this.animationFrameId = requestAnimationFrame(this.animate);
  }

  /**
   * Creates and compiles a shader.
   */
  private createShader(type: number, source: string): WebGLShader | null {
    if (!this.gl) {
      return null;
    }
    const shader = this.gl.createShader(type);
    if (!shader) {
      return null;
    }

    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error(this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  /**
   * Initializes WebGL context and shaders.
   */
  private initWebGL(): void {
    this.gl = this.canvas.getContext('webgl2', {
      alpha: true,
      antialias: true,
    });
    if (!this.gl) {
      console.error('WebGL 2.0 is not supported');
      return;
    }

    const vertexShader = this.createShader(
      this.gl.VERTEX_SHADER,
      vertexShaderSource,
    );
    const fragmentShader = this.createShader(
      this.gl.FRAGMENT_SHADER,
      fragmentShaderSource,
    );

    if (!vertexShader || !fragmentShader) {
      return;
    }

    this.program = this.gl.createProgram();
    if (!this.program) {
      return;
    }

    this.gl.attachShader(this.program, vertexShader);
    this.gl.attachShader(this.program, fragmentShader);
    this.gl.linkProgram(this.program);

    if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
      console.error(this.gl.getProgramInfoLog(this.program));
      return;
    }

    this.gl.useProgram(this.program);

    // Setup Geometry (Full Quad)
    const positionBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      this.gl.STATIC_DRAW,
    );

    const posLoc = this.gl.getAttribLocation(this.program, 'a_position');
    this.gl.enableVertexAttribArray(posLoc);
    this.gl.vertexAttribPointer(posLoc, 2, this.gl.FLOAT, false, 0, 0);

    // Get Uniform Locations
    this.locations = {
      uGradientTexture: this.gl.getUniformLocation(
        this.program,
        'u_gradientTexture',
      ),
      uInnerRadius: this.gl.getUniformLocation(this.program, 'u_innerRadius'),
      uIntensity: this.gl.getUniformLocation(this.program, 'u_intensity'),
      uOuterRadius: this.gl.getUniformLocation(this.program, 'u_outerRadius'),
      uProgress: this.gl.getUniformLocation(this.program, 'u_progress'),
      uResolution: this.gl.getUniformLocation(this.program, 'u_resolution'),
      uReversed: this.gl.getUniformLocation(this.program, 'u_reversed'),
      uStartAngle: this.gl.getUniformLocation(this.program, 'u_startAngle'),
      uTime: this.gl.getUniformLocation(this.program, 'u_time'),
    };
  }

  private startAnimation(): void {
    this.animationFrameId = requestAnimationFrame(this.animate);
  }
}
