const DEFAULT_OPTIONS = {
  deadzone: 0.28,
  joystickSize: 160,
  knobSize: 52,
  throttleRepeatMs: 80,
  boostLabel: "BOOST",
  pauseLabel: "Ⅱ",
  menuLabel: "~",
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function applyBaseButtonStyles(button) {
  Object.assign(button.style, {
    appearance: "none",
    border: "1px solid rgba(255,255,255,0.35)",
    background: "rgba(12, 18, 30, 0.72)",
    color: "#ffffff",
    borderRadius: "14px",
    fontFamily: "inherit",
    fontSize: "14px",
    fontWeight: "700",
    letterSpacing: "0.08em",
    touchAction: "none",
    userSelect: "none",
    WebkitUserSelect: "none",
    backdropFilter: "blur(6px)",
    WebkitBackdropFilter: "blur(6px)",
    boxShadow: "0 8px 30px rgba(0,0,0,0.28)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  });
}

function setKeyState(keys, key, isPressed) {
  if (!keys) return;
  keys[key] = !!isPressed;
}

function clearMovementKeys(keys) {
  setKeyState(keys, "w", false);
  setKeyState(keys, "a", false);
  setKeyState(keys, "s", false);
  setKeyState(keys, "d", false);
}

function clearActionKeys(keys) {
  setKeyState(keys, "shift", false);
  setKeyState(keys, "Shift", false);
  setKeyState(keys, "ShiftLeft", false);
  setKeyState(keys, "ShiftRight", false);
  setKeyState(keys, "arrowup", false);
  setKeyState(keys, "arrowdown", false);
}

function setBoostState(keys, isPressed) {
  setKeyState(keys, "shift", isPressed);
  setKeyState(keys, "Shift", isPressed);
  setKeyState(keys, "ShiftLeft", isPressed);
  setKeyState(keys, "ShiftRight", isPressed);
}

function setThrottleState(keys, direction) {
  const upPressed = direction === "up";
  const downPressed = direction === "down";
  setKeyState(keys, "arrowup", upPressed);
  setKeyState(keys, "arrowdown", downPressed);
}

function pulseMenuKey(keys) {
  setKeyState(keys, "`", true);
  setKeyState(keys, "~", true);
  setKeyState(keys, "Backquote", true);

  window.setTimeout(() => {
    setKeyState(keys, "`", false);
    setKeyState(keys, "~", false);
    setKeyState(keys, "Backquote", false);
  }, 80);
}

function isMobileLikeDevice() {
  if (typeof window === "undefined") return false;
  const coarse = window.matchMedia?.("(pointer: coarse)")?.matches;
  const touchPoints = navigator.maxTouchPoints > 0;
  return !!(coarse || touchPoints);
}

export function createMobileControls(keys, userOptions = {}) {
  if (typeof document === "undefined") {
    return {
      destroy() {},
      show() {},
      hide() {},
      isActive: false,
      setPauseHandler() {},
      setMenuHandler() {},
    };
  }

  const options = { ...DEFAULT_OPTIONS, ...userOptions };
  // Strict mode: do not even create controls on non-mobile devices
  if (!isMobileLikeDevice() && options.autoShow !== true) {
    return {
      destroy() {},
      show() {},
      hide() {},
      isActive() {
        return false;
      },
      isMobileLikeDevice,
      setPauseHandler() {},
      setMenuHandler() {},
    };
  }
  const state = {
    active: false,
    pointerId: null,
    currentDirection: null,
    throttleTimer: null,
    elements: {},
    pauseHandler: typeof options.onPause === "function" ? options.onPause : null,
    menuHandler: typeof options.onMenu === "function" ? options.onMenu : null,
  };

  const container = document.createElement("div");
  container.id = "mobile-controls-overlay";
  Object.assign(container.style, {
    position: "fixed",
    inset: "0",
    zIndex: "10002",
    pointerEvents: "none",
    display: "none",
    touchAction: "none",
  });

  const joystickZone = document.createElement("div");
  joystickZone.id = "mobile-joystick-zone";
  Object.assign(joystickZone.style, {
    position: "absolute",
    left: "50%",
    bottom: "18px",
    transform: "translateX(-50%)",
    width: `${options.joystickSize}px`,
    height: `${options.joystickSize}px`,
    borderRadius: "999px",
    border: "1px solid rgba(255,255,255,0.22)",
    background: "rgba(10,16,24,0.26)",
    boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
    pointerEvents: "auto",
    touchAction: "none",
    overflow: "hidden",
  });

  const joystickRing = document.createElement("div");
  Object.assign(joystickRing.style, {
    position: "absolute",
    inset: "0",
    borderRadius: "999px",
    border: "1px solid rgba(255,255,255,0.14)",
  });

  const joystickKnob = document.createElement("div");
  Object.assign(joystickKnob.style, {
    position: "absolute",
    width: `${options.knobSize}px`,
    height: `${options.knobSize}px`,
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -50%)",
    borderRadius: "999px",
    background: "rgba(255,255,255,0.16)",
    border: "1px solid rgba(255,255,255,0.28)",
    boxShadow: "0 4px 18px rgba(0,0,0,0.22)",
    pointerEvents: "none",
  });

  joystickZone.appendChild(joystickRing);
  joystickZone.appendChild(joystickKnob);

  const throttleStack = document.createElement("div");
  throttleStack.id = "mobile-throttle-stack";
  Object.assign(throttleStack.style, {
    position: "absolute",
    left: "18px",
    bottom: `${18 + options.joystickSize + 24}px`,
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    pointerEvents: "auto",
  });

  const throttleUpButton = document.createElement("button");
  throttleUpButton.type = "button";
  throttleUpButton.textContent = "THR +";
  applyBaseButtonStyles(throttleUpButton);
  Object.assign(throttleUpButton.style, {
    width: "88px",
    height: "46px",
  });

  const throttleDownButton = document.createElement("button");
  throttleDownButton.type = "button";
  throttleDownButton.textContent = "THR -";
  applyBaseButtonStyles(throttleDownButton);
  Object.assign(throttleDownButton.style, {
    width: "88px",
    height: "46px",
  });

  throttleStack.appendChild(throttleUpButton);
  throttleStack.appendChild(throttleDownButton);

  const actionStack = document.createElement("div");
  actionStack.id = "mobile-action-stack";
  Object.assign(actionStack.style, {
    position: "absolute",
    right: "18px",
    bottom: "18px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "12px",
    pointerEvents: "auto",
  });

  const boostButton = document.createElement("button");
  boostButton.type = "button";
  boostButton.textContent = options.boostLabel;
  applyBaseButtonStyles(boostButton);
  Object.assign(boostButton.style, {
    width: "94px",
    height: "54px",
    borderRadius: "18px",
  });

  actionStack.appendChild(boostButton);

  const pauseButton = document.createElement("button");
  pauseButton.type = "button";
  pauseButton.textContent = options.pauseLabel;
  applyBaseButtonStyles(pauseButton);
  Object.assign(pauseButton.style, {
    position: "absolute",
    right: "16px",
    top: "16px",
    width: "82px",
    height: "42px",
    pointerEvents: "auto",
    zIndex: "10003",
  });

  const menuButton = document.createElement("button");
  menuButton.type = "button";
  menuButton.textContent = options.menuLabel;
  applyBaseButtonStyles(menuButton);
  Object.assign(menuButton.style, {
    position: "absolute",
    left: "16px",
    top: "16px",
    width: "58px",
    height: "42px",
    pointerEvents: "auto",
    zIndex: "10003",
    fontSize: "20px",
  });

  container.appendChild(joystickZone);
  container.appendChild(throttleStack);
  container.appendChild(actionStack);
  container.appendChild(pauseButton);
  container.appendChild(menuButton);
  document.body.appendChild(container);

  state.elements = {
    container,
    joystickZone,
    joystickKnob,
    throttleUpButton,
    throttleDownButton,
    boostButton,
    pauseButton,
    menuButton,
  };

  function resetJoystick() {
    state.pointerId = null;
    clearMovementKeys(keys);
    joystickKnob.style.left = "50%";
    joystickKnob.style.top = "50%";
  }

  function updateJoystickFromPointer(clientX, clientY) {
    const rect = joystickZone.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const radius = rect.width / 2;
    const knobRadius = options.knobSize / 2;
    const maxDistance = radius - knobRadius - 6;

    let dx = clientX - centerX;
    let dy = clientY - centerY;
    const distance = Math.hypot(dx, dy);

    if (distance > maxDistance) {
      const scale = maxDistance / distance;
      dx *= scale;
      dy *= scale;
    }

    const normalizedX = dx / maxDistance;
    const normalizedY = dy / maxDistance;

    joystickKnob.style.left = `${50 + normalizedX * 50}%`;
    joystickKnob.style.top = `${50 + normalizedY * 50}%`;

    clearMovementKeys(keys);

    const absX = Math.abs(normalizedX);
    const absY = Math.abs(normalizedY);

    if (absX < options.deadzone && absY < options.deadzone) {
      return;
    }

    if (absX >= absY) {
      if (normalizedX <= -options.deadzone) {
        setKeyState(keys, "a", true);
      } else if (normalizedX >= options.deadzone) {
        setKeyState(keys, "d", true);
      }
    } else {
      if (normalizedY <= -options.deadzone) {
        setKeyState(keys, "w", true);
      } else if (normalizedY >= options.deadzone) {
        setKeyState(keys, "s", true);
      }
    }
  }

  function startThrottle(direction) {
    state.currentDirection = direction;
    setThrottleState(keys, direction);

    if (state.throttleTimer) {
      window.clearInterval(state.throttleTimer);
    }

    state.throttleTimer = window.setInterval(() => {
      setThrottleState(keys, state.currentDirection);
    }, options.throttleRepeatMs);
  }

  function stopThrottle() {
    state.currentDirection = null;
    setThrottleState(keys, null);
    if (state.throttleTimer) {
      window.clearInterval(state.throttleTimer);
      state.throttleTimer = null;
    }
  }

  function bindHoldButton(button, onStart, onEnd) {
    const start = (event) => {
      event.preventDefault();
      onStart();
    };

    const end = (event) => {
      event.preventDefault();
      onEnd();
    };

    button.addEventListener("pointerdown", start);
    button.addEventListener("pointerup", end);
    button.addEventListener("pointercancel", end);
    button.addEventListener("pointerleave", end);

    return () => {
      button.removeEventListener("pointerdown", start);
      button.removeEventListener("pointerup", end);
      button.removeEventListener("pointercancel", end);
      button.removeEventListener("pointerleave", end);
    };
  }

  const unbindThrottleUp = bindHoldButton(
    throttleUpButton,
    () => startThrottle("up"),
    () => stopThrottle()
  );

  const unbindThrottleDown = bindHoldButton(
    throttleDownButton,
    () => startThrottle("down"),
    () => stopThrottle()
  );

  const unbindBoost = bindHoldButton(
    boostButton,
    () => setBoostState(keys, true),
    () => setBoostState(keys, false)
  );

  const onPausePointerDown = (event) => {
    event.preventDefault();
    if (state.pauseHandler) {
      state.pauseHandler();
    }
  };
  pauseButton.addEventListener("pointerdown", onPausePointerDown);

  const onMenuPointerDown = (event) => {
    event.preventDefault();

    if (state.menuHandler) {
      state.menuHandler();
      return;
    }

    pulseMenuKey(keys);
  };
  menuButton.addEventListener("pointerdown", onMenuPointerDown);

  const onJoystickPointerDown = (event) => {
    event.preventDefault();
    state.pointerId = event.pointerId;
    joystickZone.setPointerCapture?.(event.pointerId);
    updateJoystickFromPointer(event.clientX, event.clientY);
  };

  const onJoystickPointerMove = (event) => {
    if (event.pointerId !== state.pointerId) return;
    event.preventDefault();
    updateJoystickFromPointer(event.clientX, event.clientY);
  };

  const onJoystickPointerEnd = (event) => {
    if (event.pointerId !== state.pointerId) return;
    event.preventDefault();
    resetJoystick();
  };

  joystickZone.addEventListener("pointerdown", onJoystickPointerDown);
  joystickZone.addEventListener("pointermove", onJoystickPointerMove);
  joystickZone.addEventListener("pointerup", onJoystickPointerEnd);
  joystickZone.addEventListener("pointercancel", onJoystickPointerEnd);
  joystickZone.addEventListener("pointerleave", onJoystickPointerEnd);

  function show() {
    state.active = true;
    container.style.display = "block";
  }

  function hide() {
    state.active = false;
    container.style.display = "none";
    resetJoystick();
    stopThrottle();
    setBoostState(keys, false);
  }

  function destroy() {
    hide();
    unbindThrottleUp();
    unbindThrottleDown();
    unbindBoost();
    pauseButton.removeEventListener("pointerdown", onPausePointerDown);
    menuButton.removeEventListener("pointerdown", onMenuPointerDown);
    joystickZone.removeEventListener("pointerdown", onJoystickPointerDown);
    joystickZone.removeEventListener("pointermove", onJoystickPointerMove);
    joystickZone.removeEventListener("pointerup", onJoystickPointerEnd);
    joystickZone.removeEventListener("pointercancel", onJoystickPointerEnd);
    joystickZone.removeEventListener("pointerleave", onJoystickPointerEnd);
    clearMovementKeys(keys);
    clearActionKeys(keys);
    container.remove();
  }

  if (options.autoShow !== false) {
    show();
  }

  return {
    show,
    hide,
    destroy,
    isActive() {
      return state.active;
    },
    isMobileLikeDevice,
    setPauseHandler(handler) {
      state.pauseHandler = typeof handler === "function" ? handler : null;
    },
    setMenuHandler(handler) {
      state.menuHandler = typeof handler === "function" ? handler : null;
    },
  };
}