export class GameLoop {
  constructor({ update, render, maxDelta = 0.05 } = {}) {
    if (typeof update !== 'function' || typeof render !== 'function') {
      throw new TypeError('GameLoop requires update(dt) and render() callbacks.');
    }

    this.update = update;
    this.render = render;
    this.maxDelta = maxDelta;
    this.running = false;
    this.lastTimestamp = 0;
    this.frameId = null;
    this.frame = this.frame.bind(this);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTimestamp = performance.now();
    this.frameId = requestAnimationFrame(this.frame);
  }

  stop() {
    this.running = false;
    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
  }

  frame(timestamp) {
    if (!this.running) return;

    const rawDelta = (timestamp - this.lastTimestamp) / 1000;
    const dt = Math.min(this.maxDelta, Math.max(0, rawDelta));
    this.lastTimestamp = timestamp;

    this.update(dt);
    if (!this.running) return;

    this.render();
    this.frameId = requestAnimationFrame(this.frame);
  }
}
