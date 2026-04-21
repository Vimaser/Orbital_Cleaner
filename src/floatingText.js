import * as THREE from "three";

const _texts = [];

function createTextSprite(message) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  const fontSize = 36;
  ctx.font = `${fontSize}px monospace`;
  const padding = 12;

  const textWidth = ctx.measureText(message).width;
  canvas.width = Math.ceil(textWidth + padding * 2);
  canvas.height = Math.ceil(fontSize + padding * 2);

  // redraw after resize
  ctx.font = `${fontSize}px monospace`;
  ctx.fillStyle = "rgba(255, 230, 120, 1)";
  ctx.textBaseline = "middle";
  ctx.fillText(message, padding, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  });

  const sprite = new THREE.Sprite(material);
  sprite.scale.set(canvas.width * 0.01, canvas.height * 0.01, 1);

  return sprite;
}

export function spawnFloatingText(scene, position, message, anchor = null) {
  if (!scene || !position) return;

  const sprite = createTextSprite(message);
  const localOffset = new THREE.Vector3(0, 1.2, 0);

  if (anchor) {
    sprite.position.copy(localOffset);
    anchor.add(sprite);
  } else {
    sprite.position.copy(position).add(localOffset);
  }

  if (!sprite.parent) {
    scene.add(sprite);
  }

  _texts.push({
    sprite,
    life: 1.2,
    velocity: new THREE.Vector3(0, 0.45, 0),
    anchor,
  });
}

export function updateFloatingTexts(dt) {
  for (let i = _texts.length - 1; i >= 0; i--) {
    const t = _texts[i];
    t.life -= dt;

    if (t.life <= 0) {
      if (t.sprite.parent) t.sprite.parent.remove(t.sprite);
      t.sprite.material.map.dispose();
      t.sprite.material.dispose();
      _texts.splice(i, 1);
      continue;
    }

    if (t.anchor) {
      t.sprite.position.addScaledVector(t.velocity, dt * 0.35);
    } else {
      t.sprite.position.addScaledVector(t.velocity, dt);
    }

    const alpha = Math.max(0, t.life / 1.2);
    t.sprite.material.opacity = alpha;
  }
}
