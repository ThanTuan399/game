ASSET PIPELINE

The current Full Edition renders its pixel-art scene directly on an integer-aligned Canvas so it can run without external downloads.

Future art packs can be added here without changing the world/game systems:
assets/
  characters/
  buildings/
  tiles/
  crops/
  animals/
  effects/
  ui/

The renderer is intentionally separated in js/renderer.js so these assets can replace the procedural draw calls later.
