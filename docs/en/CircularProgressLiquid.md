# CircularProgressLiquid

## Description

`CircularProgressLiquid` is a class for creating a circular progress bar with a **liquid** (metaballs) effect using WebGL.
It allows creating smooth animations with customizable volume distortion (lens effect).

The effect is rendered on the provided HTML `<canvas>` element.

[👀 View Demo](https://webeach.github.io/gl-circular-progress/CircularProgressLiquid.html)

---

## Signature

```ts
new CircularProgressLiquid(container: HTMLCanvasElement, options: CircularProgressLiquidOptions)
```

- **Parameters**
   - `container: HTMLCanvasElement` — the canvas element where the progress will be rendered.
   - `options: CircularProgressLiquidOptions` — configuration object.

---

## Examples

### Basic Usage

```ts
import { CircularProgressLiquid } from '@webeach/gl-circular-progress/CircularProgressLiquid';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;

const instance = new CircularProgressLiquid(canvas, {
  colors: [0x00c6ff, 0x0072ff], // Liquid colors
  progress: 0.6, // Initial value
  speed: 0.5,
  startAngle: -90, // Start from left
  thickness: 30,
  volume: 0.5, // Volume/Lens effect
});
```

### Dynamic Updates

All properties can be changed on the fly using the instance setters.

```ts
instance.speed = 1.2; // Speed up flow
instance.volume = 0.8; // Increase lens effect
instance.reversed = true; // Change direction
```

---

## API

### Options (`CircularProgressLiquidOptions`)

Configuration object passed to the constructor.

| Property | Type | Default | Description |
|---|---|---|---|
| `colors`     | `number[]` | `[0x000000]` | **Required.** Array of HEX colors. Used for the liquid gradient. |
| `progress`   | `number`   | `0`          | Initial progress value (0.0 to 1.0). |
| `reversed`   | `boolean`  | `false`      | Fill direction. If `true`, progress fills counter-clockwise. |
| `speed`      | `number`   | `1.0`        | Animation speed of the liquid waves. |
| `startAngle` | `number`   | `0`          | Starting angle of the progress in degrees. |
| `thickness`  | `number`   | `10`         | Thickness of the progress ring in pixels. |
| `volume`     | `number`   | `0`          | Volume effect (lens/3D). Value from `0.0` (flat) to `1.0` (strong effect). |

### Instance Methods and Properties

After creating an instance, the following methods and properties are available:

#### `destroy(): void`

Cleans up WebGL resources, removes event listeners, and stops the animation. Must be called before removing the component.

#### Properties

The following properties can be read and written for dynamic updates:

- `colors`: `number[]`
- `progress`: `number`
- `reversed`: `boolean`
- `speed`: `number`
- `startAngle`: `number`
- `thickness`: `number`
- `volume`: `number`

---

## Typing

```ts
import type { CircularProgressLiquidOptions } from '@webeach/gl-circular-progress/CircularProgressLiquid';
```

---

## See Also

- [CircularProgressFire](./CircularProgressFire.md) — fire effect.

