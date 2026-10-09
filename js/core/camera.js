import { clamp, lerp } from '../utils.js';

export class Camera {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.zoom = 1;
    this.deadZoneX = 96;
    this.deadZoneY = 64;
    this.smoothing = 0.1;
  }

  update(player, world, dt, viewW = 960, viewH = 540) {
    const tileSize = world.tileSize;
    const playerX = player.x * tileSize;
    const playerY = player.y * tileSize;

    const centerX = this.x + viewW / 2;
    const centerY = this.y + viewH / 2;

    let targetX = this.x;
    let targetY = this.y;

    if (playerX < centerX - this.deadZoneX) {
      targetX -= (centerX - this.deadZoneX) - playerX;
    } else if (playerX > centerX + this.deadZoneX) {
      targetX += playerX - (centerX + this.deadZoneX);
    }

    if (playerY < centerY - this.deadZoneY) {
      targetY -= (centerY - this.deadZoneY) - playerY;
    } else if (playerY > centerY + this.deadZoneY) {
      targetY += playerY - (centerY + this.deadZoneY);
    }

    const maxX = Math.max(0, world.width * tileSize - viewW);
    const maxY = Math.max(0, world.height * tileSize - viewH);
    targetX = clamp(targetX, 0, maxX);
    targetY = clamp(targetY, 0, maxY);

    const alpha = 1 - Math.pow(1 - this.smoothing, dt * 60);
    this.x = clamp(lerp(this.x, targetX, alpha), 0, maxX);
    this.y = clamp(lerp(this.y, targetY, alpha), 0, maxY);
  }
}
