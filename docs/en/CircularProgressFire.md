# CircularProgressFire

## Description

`CircularProgressFire` is a class for creating a circular progress bar with a **fire** effect using WebGL.
It allows flexible customization of colors, speed, and intensity of the flame.

The effect is rendered on the provided HTML `<canvas>` element.

[👀 View Demo](https://webeach.github.io/gl-circular-progress/CircularProgressFire.html)

---

## Signature

```ts
new CircularProgressFire(container: HTMLCanvasElement, options: CircularProgressFireOptions)
```

- **Parameters**
   - `container: HTMLCanvasElement` — the canvas element where the progress will be rendered.
   - `options: CircularProgressFireOptions` — configuration object.

---

## Examples

### Basic Usage

```ts
import { CircularProgressFire } from '@webeach/gl-circular-progress';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;

const instance = new CircularProgressFire(canvas, {
  colors: [0xff5a00, 0xff9a00, 0xffce00], // Fire colors
  intensity: 1.0,
  progress: 0.75, // Initial value
  speed: 1.5,
  thickness: 20,
});
```

### Dynamic Updates

All properties can be changed on the fly using the instance setters.

```ts
instance.colors = [0xff0000, 0x00ff00]; // Change gradient
instance.intensity = 0.5; // Reduce fire intensity
instance.speed = 2.0; // Speed up animation
```

---

## API

### Options (`CircularProgressFireOptions`)

Configuration object passed to the constructor.

| Property | Type | Default | Description |
|---|---|---|---|
| `colors`     | `number[]` | `[0x000000]` | **Required.** Array of HEX colors (e.g. `0xff5a00`). Used for the gradient. |
| `intensity`  | `number`   | `1.0`        | Intensity of the fire effect. |
| `progress`   | `number`   | `0`          | Initial progress value (0.0 to 1.0). |
| `reversed`   | `boolean`  | `false`      | Fill direction. If `true`, progress fills counter-clockwise. |
| `speed`      | `number`   | `1.0`        | Animation speed of the flame. |
| `startAngle` | `number`   | `0`          | Starting angle of the progress in degrees. |
| `thickness`  | `number`   | `10`         | Thickness of the progress ring in pixels. |

### Instance Methods and Properties

After creating an instance, the following methods and properties are available:

#### `destroy(): void`

Cleans up WebGL resources, removes event listeners (resize), and stops the animation. Must be called before removing the component.

#### Properties

The following properties can be read and written for dynamic updates:

- `colors`: `number[]`
- `intensity`: `number`
- `progress`: `number`
- `reversed`: `boolean`
- `speed`: `number`
- `startAngle`: `number`
- `thickness`: `number`

---

## Typing

```ts
import type { CircularProgressFireOptions } from '@webeach/gl-circular-progress';
```

---

## See Also

- [CircularProgressLiquid](./CircularProgressLiquid.md) — liquid effect.

