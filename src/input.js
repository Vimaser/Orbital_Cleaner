const keyState = Object.create(null);
const virtualState = Object.create(null);

let gamepadIndex = null;
let deadzone = 0.22;

const gamepadBindings = {
  // Movement via left stick
  KeyW: { axis: 1, dir: -1 },
  KeyS: { axis: 1, dir: 1 },
  KeyA: { axis: 0, dir: -1 },
  KeyD: { axis: 0, dir: 1 },

  // Throttle via right stick vertical, with D-pad fallback
  ArrowUp: { axis: 3, dir: -1, buttons: [12] },
  ArrowDown: { axis: 3, dir: 1, buttons: [13] },

  // Boost
  ShiftLeft: { buttons: [5, 7] },
  ShiftRight: { buttons: [5, 7] },
  Shift: { buttons: [5, 7] },

  // Confirm / interact / menu accept
  Enter: { button: 0 },

  // Pause / menu
  Escape: { button: 9 },
};

function normalizeKeyName(codeOrKey) {
  if (!codeOrKey) return "";

  if (codeOrKey === "Shift") return "Shift";
  if (codeOrKey === "Enter") return "Enter";
  if (codeOrKey === "Escape") return "Escape";
  if (codeOrKey === "ArrowUp") return "ArrowUp";
  if (codeOrKey === "ArrowDown") return "ArrowDown";
  if (codeOrKey === "ArrowLeft") return "ArrowLeft";
  if (codeOrKey === "ArrowRight") return "ArrowRight";

  return String(codeOrKey);
}

function clearVirtualState() {
  for (const key of Object.keys(virtualState)) {
    virtualState[key] = false;
  }
}

function axisPressed(value, dir, threshold) {
  if (dir < 0) return value <= -threshold;
  return value >= threshold;
}

function buttonPressed(button) {
  if (!button) return false;
  return !!(button.pressed || button.value > 0.5);
}

function getActiveGamepad() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];

  if (gamepadIndex != null && pads[gamepadIndex]) {
    return pads[gamepadIndex];
  }

  for (let i = 0; i < pads.length; i += 1) {
    if (pads[i]) {
      gamepadIndex = i;
      return pads[i];
    }
  }

  return null;
}

export function setDeadzone(value) {
  deadzone = Math.max(0, Math.min(0.95, Number(value) || 0.22));
}

export function getDeadzone() {
  return deadzone;
}

export function setVirtualKey(codeOrKey, isDown) {
  const name = normalizeKeyName(codeOrKey);
  if (!name) return;
  virtualState[name] = !!isDown;
}

export function clearVirtualKeys() {
  clearVirtualState();
}

export function isDown(codeOrKey) {
  const name = normalizeKeyName(codeOrKey);
  if (!name) return false;
  return !!(keyState[name] || virtualState[name]);
}

export function getKeyState() {
  return keyState;
}

export function getVirtualState() {
  return virtualState;
}

export function handleKeyDown(event) {
  const key = normalizeKeyName(event.key);
  const code = normalizeKeyName(event.code);

  if (key) keyState[key] = true;
  if (code) keyState[code] = true;
}

export function handleKeyUp(event) {
  const key = normalizeKeyName(event.key);
  const code = normalizeKeyName(event.code);

  if (key) keyState[key] = false;
  if (code) keyState[code] = false;
}

export function attachKeyboardListeners(target = window) {
  if (!target?.addEventListener) {
    return () => {};
  }

  const onKeyDown = (event) => {
    handleKeyDown(event);
  };

  const onKeyUp = (event) => {
    handleKeyUp(event);
  };

  target.addEventListener("keydown", onKeyDown);
  target.addEventListener("keyup", onKeyUp);

  return () => {
    target.removeEventListener("keydown", onKeyDown);
    target.removeEventListener("keyup", onKeyUp);
  };
}

export function pollGamepad() {
  clearVirtualState();

  if (typeof navigator === "undefined") {
    return;
  }

  const gamepad = getActiveGamepad();
  if (!gamepad) {
    return;
  }

  for (const [code, binding] of Object.entries(gamepadBindings)) {
    let pressed = false;

    if (typeof binding.axis === "number") {
      const axisValue = gamepad.axes?.[binding.axis] ?? 0;
      pressed = axisPressed(axisValue, binding.dir, deadzone);
    }

    if (Array.isArray(binding.buttons)) {
      pressed = pressed || binding.buttons.some((buttonIndex) =>
        buttonPressed(gamepad.buttons?.[buttonIndex])
      );
    } else if (!pressed && typeof binding.button === "number") {
      pressed = buttonPressed(gamepad.buttons?.[binding.button]);
    }
    virtualState[code] = pressed;
  }
}

export function connectFirstGamepad() {
  const gamepad = getActiveGamepad();
  return gamepad;
}

export function attachGamepadListeners(target = window) {
  if (!target?.addEventListener) {
    return () => {};
  }

  const onGamepadConnected = (event) => {
    if (event?.gamepad?.index != null) {
      gamepadIndex = event.gamepad.index;
    }
  };

  const onGamepadDisconnected = (event) => {
    if (event?.gamepad?.index === gamepadIndex) {
      gamepadIndex = null;
      clearVirtualState();
    }
  };

  target.addEventListener("gamepadconnected", onGamepadConnected);
  target.addEventListener("gamepaddisconnected", onGamepadDisconnected);

  return () => {
    target.removeEventListener("gamepadconnected", onGamepadConnected);
    target.removeEventListener("gamepaddisconnected", onGamepadDisconnected);
  };
}

export function applyVirtualStateToKeys(keys) {
  if (!keys) return;

  for (const [code, value] of Object.entries(virtualState)) {
    keys[code] = !!value;

    if (code === "KeyW") {
      keys.w = !!value;
    }

    if (code === "KeyA") {
      keys.a = !!value;
    }

    if (code === "KeyS") {
      keys.s = !!value;
    }

    if (code === "KeyD") {
      keys.d = !!value;
    }

    if (code === "ShiftLeft" || code === "ShiftRight" || code === "Shift") {
      keys.shift = !!(virtualState.ShiftLeft || virtualState.ShiftRight || virtualState.Shift);
      keys.Shift = !!(virtualState.ShiftLeft || virtualState.ShiftRight || virtualState.Shift);
      keys.ShiftLeft = !!virtualState.ShiftLeft;
      keys.ShiftRight = !!virtualState.ShiftRight;
    }

    if (code === "ArrowUp") {
      keys.arrowup = !!value;
    }

    if (code === "ArrowDown") {
      keys.arrowdown = !!value;
    }

    if (code === "Enter") {
      keys.enter = !!value;
    }

    if (code === "Escape") {
      keys.escape = !!value;
    }
  }
}

export function createInputSystem(target = window) {
  const detachKeyboard = attachKeyboardListeners(target);
  const detachGamepad = attachGamepadListeners(target);

  return {
    keyState,
    virtualState,
    isDown,
    pollGamepad,
    applyVirtualStateToKeys,
    setVirtualKey,
    clearVirtualKeys,
    setDeadzone,
    getDeadzone,
    destroy() {
      detachKeyboard();
      detachGamepad();
      clearVirtualState();
      for (const key of Object.keys(keyState)) {
        keyState[key] = false;
      }
    },
  };
}