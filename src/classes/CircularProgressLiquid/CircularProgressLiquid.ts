import { hexToCss } from '../../utils/hexToCss';
import { BaseCircularProgress } from '../BaseCircularProgress';

import fragmentShaderSource from './shaders/fragment.frag';
import vertexShaderSource from './shaders/vertex.vert';

import type { CircularProgressLiquidOptions } from './types';

/**
 * A circular progress indicator with a liquid/water effect.
 * Uses WebGL 2.0 for rendering.
 *
 * @example
 * const instance = new CircularProgressLiquid(canvas, {
 *   colors: [0x00c6ff, 0x0072ff],
 *   progress: 0.6,
 *   speed: 0.5,
 *   thickness: 30,
 *   volume: 0.5,
 * });
 *
 * @see https://webeach.github.io/gl-circular-progress/CircularProgressLiquid.html - Live Demo
 * @see https://github.com/webeach/gl-circular-progress/blob/main/docs/en/CircularProgressLiquid.md - Documentation
 */
export class CircularProgressLiquid extends BaseCircularProgress {
  private readonly extraState: { volume: number };

  private animationFrameId: number | null = null;
  private flowTime: number = 0.0;
  private gl: WebGL2RenderingContext | null = null;
  private gradientTexture: WebGLTexture | null = null;
  private lastFrameTime: number = 0;
  private locations: {
    uFlowTime: WebGLUniformLocation | null;
    uGradientTexture: WebGLUniformLocation | null;
    uInnerRadius: WebGLUniformLocation | null;
    uOuterRadius: WebGLUniformLocation | null;
    uProgress: WebGLUniformLocation | null;
    uResolution: WebGLUniformLocation | null;
    uReversed: WebGLUniformLocation | null;
    uStartAngle: WebGLUniformLocation | null;
    uVelocity: WebGLUniformLocation | null;
    uVolume: WebGLUniformLocation | null;
  } | null = null;
  private program: WebGLProgram | null = null;
  private targetProgress: number = 0.0;
  private velocity: number = 0.0;
  private visualProgress: number = 0.0;

  /**
   * Creates an instance of CircularProgressLiquid.
   *
   * @param canvas - The HTMLCanvasElement to render on.
   * @param options - Configuration options.
   */
  constructor(
    canvas: HTMLCanvasElement,
    options: CircularProgressLiquidOptions,
  ) {
    super(canvas, options);

    this.extraState = {
      volume: options.volume ?? 0,
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
   * Gets the current volume.
   */
  public get volume(): number {
    return this.extraState.volume;
  }

  /**
   * Sets the volume and updates rendering.
   */
  public set volume(value: number) {
    this.extraState.volume = Math.max(0, Math.min(1, value));
    this.updateVolume();
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
    // Speed is used in animate loop, no uniform to update
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
    // Thickness is calculated in animate loop based on canvas size, no direct uniform update needed
  }

  protected updateVolume(): void {
    if (!this.gl || !this.locations) {
      return;
    }
    this.gl.uniform1f(this.locations.uVolume, this.extraState.volume);
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
    this.flowTime += deltaTime * this.state.speed;

    const diff = this.targetProgress - this.visualProgress;
    this.visualProgress += diff * 0.1;
    this.velocity += (diff * 8.0 - this.velocity) * 0.2;

    // Render
    const startAngleRad = this.state.startAngle * (Math.PI / 180.0);

    this.gl.uniform1f(this.locations.uFlowTime, this.flowTime);
    this.gl.uniform1f(this.locations.uProgress, this.visualProgress);
    this.gl.uniform1f(this.locations.uVelocity, this.velocity);
    this.gl.uniform1f(
      this.locations.uReversed,
      this.state.reversed ? 1.0 : 0.0,
    );
    this.gl.uniform1f(this.locations.uStartAngle, startAngleRad);
    this.gl.uniform1f(this.locations.uVolume, this.extraState.volume);

    this.gl.uniform1i(this.locations.uGradientTexture, 0);

    // Calculate Radius Uniforms
    // The shader expects uOuterRadius and uInnerRadius in normalized coordinates (0.0 to 1.0 of half-width?)
    // In the user code:
    // radiusPx = canvas.width / 2
    // outerR = 0.98
    // thicknessRatio = scaledPxThickness / radiusPx
    // innerR = outerR - thicknessRatio

    // We need to be careful about aspect ratio. The shader corrects for aspect ratio:
    // st.x *= u_resolution.x / u_resolution.y;
    // So 'radius' is in UV space (0-1 approx).

    const radiusPx = Math.min(this.canvasWidth, this.canvasHeight) / 2;
    const outerR = 0.98; // Leave a small margin
    const thicknessRatio = (this.state.thickness * this.dpr) / radiusPx;
    const innerR = outerR - thicknessRatio;

    this.gl.uniform1f(this.locations.uOuterRadius, outerR);
    this.gl.uniform1f(this.locations.uInnerRadius, Math.max(0.0, innerR));

    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);

    this.animationFrameId = requestAnimationFrame(this.animate);
  }

  /**
   * Creates the gradient texture from the colors option.
   */
  private createGradientTexture(): void {
    if (!this.gl) {
      return;
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
      uFlowTime: this.gl.getUniformLocation(this.program, 'u_flowTime'),
      uGradientTexture: this.gl.getUniformLocation(
        this.program,
        'u_gradientTexture',
      ),
      uInnerRadius: this.gl.getUniformLocation(this.program, 'u_innerRadius'),
      uOuterRadius: this.gl.getUniformLocation(this.program, 'u_outerRadius'),
      uProgress: this.gl.getUniformLocation(this.program, 'u_progress'),
      uResolution: this.gl.getUniformLocation(this.program, 'u_resolution'),
      uReversed: this.gl.getUniformLocation(this.program, 'u_reversed'),
      uStartAngle: this.gl.getUniformLocation(this.program, 'u_startAngle'),
      uVelocity: this.gl.getUniformLocation(this.program, 'u_velocity'),
      uVolume: this.gl.getUniformLocation(this.program, 'u_volume'),
    };
  }

  private startAnimation(): void {
    this.animationFrameId = requestAnimationFrame(this.animate);
  }
}
