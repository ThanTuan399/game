export class Player {
  constructor(name, spawn) {
    this.name = name || 'Minh';
    this.x = spawn.x + 0.5;
    this.y = spawn.y + 0.5;
    this.speed = 3.3;
    this.runSpeed = 5.4;
    this.dir = 'down';
    this.stamina = 100;
    this.maxStamina = 100;
    this.energy = 100;
    this.maxEnergy = 100;
    this.anim = 0;
    this.step = 0;
    this.tool = 'hand';
  }

  update(dt, input, world) {
    let dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    let dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);

    if (dx || dy) {
      const len = Math.hypot(dx, dy);
      dx /= len;
      dy /= len;
      this.dir = Math.abs(dx) > Math.abs(dy)
        ? (dx > 0 ? 'right' : 'left')
        : (dy > 0 ? 'down' : 'up');

      const running = input.run && this.stamina > 0;
      const step = (running ? this.runSpeed : this.speed) * dt;

      if (world.canWalk(this.x + dx * step, this.y)) this.x += dx * step;
      if (world.canWalk(this.x, this.y + dy * step)) this.y += dy * step;

      this.anim += dt * (running ? 11 : 7);
      this.step = Math.floor(this.anim) % 4;
      this.stamina = running
        ? Math.max(0, this.stamina - dt * 25)
        : Math.min(this.maxStamina, this.stamina + dt * 18);
    } else {
      this.stamina = Math.min(this.maxStamina, this.stamina + dt * 12);
      this.step = 0;
    }
  }

  get tile() {
    return { x: Math.floor(this.x), y: Math.floor(this.y) };
  }

  get actionTile() {
    const { x, y } = this.tile;
    const offset = {
      up: [0, -1],
      down: [0, 1],
      left: [-1, 0],
      right: [1, 0]
    }[this.dir] || [0, 1];

    return { x: x + offset[0], y: y + offset[1] };
  }

  restoreForNewDay(homeLevel = 1) {
    this.maxEnergy = 100 + Math.max(0, homeLevel - 1) * 20;
    this.energy = this.maxEnergy;
    this.stamina = this.maxStamina;
  }
}
