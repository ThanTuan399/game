export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.just = new Set();
    this.canvas = canvas;
    this.mouse = { x: 0, y: 0, down: false };

    window.addEventListener('keydown', event => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Tab'].includes(event.key)) {
        event.preventDefault();
      }

      if (!this.keys.has(event.key)) this.just.add(event.key);
      this.keys.add(event.key);
    });

    window.addEventListener('keyup', event => this.keys.delete(event.key));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.just.clear();
      this.mouse.down = false;
    });

    canvas.addEventListener('mousemove', event => {
      const rect = canvas.getBoundingClientRect();
      this.mouse.x = (event.clientX - rect.left) * (canvas.width / rect.width);
      this.mouse.y = (event.clientY - rect.top) * (canvas.height / rect.height);
    });

    canvas.addEventListener('mousedown', () => {
      this.mouse.down = true;
    });

    window.addEventListener('mouseup', () => {
      this.mouse.down = false;
    });
  }

  get up() {
    return this.keys.has('w') || this.keys.has('W') || this.keys.has('ArrowUp');
  }

  get down() {
    return this.keys.has('s') || this.keys.has('S') || this.keys.has('ArrowDown');
  }

  get left() {
    return this.keys.has('a') || this.keys.has('A') || this.keys.has('ArrowLeft');
  }

  get right() {
    return this.keys.has('d') || this.keys.has('D') || this.keys.has('ArrowRight');
  }

  get run() {
    return this.keys.has('Shift');
  }

  consume(key) {
    if (!this.just.has(key)) return false;
    this.just.delete(key);
    return true;
  }

  clear() {
    this.just.clear();
  }
}
