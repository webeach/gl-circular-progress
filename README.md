<div align="center">
  <img alt="gl-circular-progress" src="./assets/logo.svg" height="96">
  <br><br><br>
  <p>
    <a href="https://www.npmjs.com/package/@webeach/gl-circular-progress">
       <img src="https://img.shields.io/npm/v/@webeach/gl-circular-progress.svg?color=646fe1&labelColor=9B7AEF" alt="npm package" />
    </a>
    <a href="https://github.com/webeach/gl-circular-progress/actions">
      <img src="https://img.shields.io/github/actions/workflow/status/webeach/gl-circular-progress/ci.yml?color=646fe1&labelColor=9B7AEF" alt="build" />
    </a>
    <a href="https://www.npmjs.com/package/@webeach/gl-circular-progress">
      <img src="https://img.shields.io/npm/dm/@webeach/gl-circular-progress.svg?color=646fe1&labelColor=9B7AEF" alt="npm downloads" />
    </a>
  </p>
  <p><a href="./README.md">🇺🇸 English version</a> | <a href="./README.ru.md">🇷🇺 Русская версия</a></p>
  <p>Beautiful WebGL circular progress bars library (Fire and Liquid effects).</p>
  <br>
  <p><a href="https://webeach.github.io/gl-circular-progress">👀 View Demo</a></p>
</div>

---

## 💎 Features

- **WebGL Rendering.** High performance and smooth shader animations.
- **Stunning Effects.** Ready-to-use presets for `Fire` and `Liquid` simulation.
- **Fully Customizable.** Configure colors, thickness, speed, intensity, and other parameters.
- **Lightweight.** **Zero dependencies**, optimized code.
- **TypeScript.** Full typing out of the box.

---

## 📦 Installation

```bash
npm install @webeach/gl-circular-progress
```

or

```bash
pnpm install @webeach/gl-circular-progress
```

or

```bash
yarn add @webeach/gl-circular-progress
```

---

## 📥 Usage

```ts
import { CircularProgressFire } from '@webeach/gl-circular-progress';

// Find canvas element
const canvas = document.getElementById('my-canvas');

// Initialize progress bar
const instance = new CircularProgressFire(canvas, {
  colors: [0xff5a00, 0xff9a00],
  progress: 0.5, // Initial value
  speed: 1.5,
  thickness: 15,
});

// Don't forget to clean up when removing the component
// instance.destroy();
```

---

## 🛠 Classes and Documentation

The library provides two main classes with different visual effects:

### 🔥 [CircularProgressFire](./docs/en/CircularProgressFire.md)
Circular progress with a dynamic fire effect. Supports configuration of fire intensity and color gradients.

### 💧 [CircularProgressLiquid](./docs/en/CircularProgressLiquid.md)
Circular progress with a fluid liquid and metaballs effect. Supports "volume" configuration for creating a 3D lens effect.

---

## 🧩 Dependencies

The library has **Zero external dependencies** and is written in native WebGL.

---

## 🔖 Releasing

Releases are automated with `semantic-release`.

Before publishing a new version, make sure that:

1. All changes are committed and pushed to `main`.
2. Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/):
   - `feat: ...` — new features
   - `fix: ...` — bug fixes
   - `chore: ...`, `refactor: ...`, etc. — as needed
3. The next version (`patch`, `minor`, `major`) is derived automatically from the commit types.

---

## 👤 Author

Developed and maintained by [Ruslan Martynov](https://github.com/ruslan-mart).

Have an idea or found a bug? Open an issue or send a pull request.

---

## 📄 License

This package is distributed under the [MIT License](./LICENSE).
