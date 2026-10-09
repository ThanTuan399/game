export class GameLoop {
  constructor({ update, render, maxDelta = 0.05 }) {
    this.update = update;
    this.render = render;
    this.maxDelta = maxDelta;
    this.running = false;
    this.last = 0;
    this.frameId = 0;
    this.tick = this.tick.bind(this);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.frameId = requestAnimationFrame(this.tick);
  }

  stop() {
    if (!this.running) return;
    this.running = false;
    cancelAnimationFrame(this.frameId);
    this.frameId = 0;
  }

  tick(timestamp) {
    if (!this.running) return;

    const elapsed = Math.max(0, (timestamp - this.last) / 1000);
    const dt = Math.min(this.maxDelta, elapsed);
    this.last = timestamp;

    this.update(dt, timestamp);
    this.render(dt, timestamp);

    this.frameId = requestAnimationFrame(this.tick);
  }
}
