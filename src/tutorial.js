const DEFAULT_TUTORIAL_CONFIG = {
  messageDuration: 4.2,
  fadeOutDuration: 0.65,
  bottomOffset: 110,
  maxWidth: 520,
}

const TUTORIAL_MESSAGES = {
  repair: 'Match alignment and hold steady to complete repairs.',
  tow: 'Debris can be burned down in lower orbit. Line up and hold steady.',
  burn: 'Burn in progress. Maintain position until the debris breaks down.',
  debrisIntro: 'Line up and hold steady to burn debris.',
  debrisUnstable: 'Stabilize and stay aligned to start the burn.',
  debrisAligned: 'Hold position. Burn window is open.',
  debrisLost: 'Lost alignment. Re-center and hold steady.',
  fuelLow: 'Fuel is getting low. Return to the ISS before you lose boost.',
}

export function createTutorialState(config = {}) {
  return {
    enabled: true,
    repairHintShown: false,
    towHintShown: false,
    burnHintShown: false,
    debrisIntroShown: false,
    fuelLowHintShown: false,
    stickyMessage: '',
    stickyKey: null,
    activeMessage: '',
    activeKey: null,
    messageTimer: 0,
    config: {
      ...DEFAULT_TUTORIAL_CONFIG,
      ...config,
    },
  }
}

export function showRepairHintOnce(tutorialState) {
  if (!tutorialState || tutorialState.repairHintShown) return false

  tutorialState.repairHintShown = true
  return showTutorialHint(tutorialState, 'repair', TUTORIAL_MESSAGES.repair)
}

export function setTutorialEnabled(tutorialState, enabled) {
  if (!tutorialState) return

  tutorialState.enabled = !!enabled

  if (!tutorialState.enabled) {
    clearTutorialHint(tutorialState)
  }
}

export function toggleTutorialEnabled(tutorialState) {
  if (!tutorialState) return false

  setTutorialEnabled(tutorialState, !tutorialState.enabled)
  return tutorialState.enabled
}

export function clearTutorialHint(tutorialState) {
  if (!tutorialState) return

  tutorialState.activeMessage = ''
  tutorialState.activeKey = null
  tutorialState.messageTimer = 0
}

export function clearStickyTutorialHint(tutorialState, key = null) {
  if (!tutorialState) return

  if (key && tutorialState.stickyKey !== key) return

  tutorialState.stickyMessage = ''
  tutorialState.stickyKey = null
}

function showTutorialHint(tutorialState, key, message) {
  if (!tutorialState?.enabled || !message) return false

  tutorialState.activeKey = key
  tutorialState.activeMessage = message
  tutorialState.messageTimer = tutorialState.config.messageDuration
  return true
}

export function showStickyTutorialHint(tutorialState, key, message) {
  if (!tutorialState?.enabled || !message) return false

  tutorialState.stickyKey = key
  tutorialState.stickyMessage = message
  return true
}

export function showTowHintOnce(tutorialState) {
  if (!tutorialState || tutorialState.towHintShown) return false

  tutorialState.towHintShown = true
  return showTutorialHint(tutorialState, 'tow', TUTORIAL_MESSAGES.tow)
}

export function showBurnHintOnce(tutorialState) {
  if (!tutorialState || tutorialState.burnHintShown) return false

  tutorialState.burnHintShown = true
  return showTutorialHint(tutorialState, 'burn', TUTORIAL_MESSAGES.burn)
}

export function showDebrisIntroHintOnce(tutorialState) {
  if (!tutorialState || tutorialState.debrisIntroShown) return false

  tutorialState.debrisIntroShown = true
  return showTutorialHint(
    tutorialState,
    'debrisIntro',
    TUTORIAL_MESSAGES.debrisIntro,
  )
}

export function showFuelLowHintOnce(tutorialState) {
  if (!tutorialState || tutorialState.fuelLowHintShown) return false

  tutorialState.fuelLowHintShown = true
  return showTutorialHint(tutorialState, 'fuelLow', TUTORIAL_MESSAGES.fuelLow)
}

export function showDebrisStickyHint(tutorialState, status = 'intro') {
  if (!tutorialState?.enabled) return false

  const normalizedStatus = String(status || 'intro').toLowerCase()

  if (normalizedStatus === 'burning') {
    return showStickyTutorialHint(
      tutorialState,
      'debrisBurning',
      TUTORIAL_MESSAGES.burn,
    )
  }

  if (normalizedStatus === 'aligned') {
    return showStickyTutorialHint(
      tutorialState,
      'debrisAligned',
      TUTORIAL_MESSAGES.debrisAligned,
    )
  }

  if (normalizedStatus === 'lost') {
    return showStickyTutorialHint(
      tutorialState,
      'debrisLost',
      TUTORIAL_MESSAGES.debrisLost,
    )
  }

  if (normalizedStatus === 'unstable') {
    return showStickyTutorialHint(
      tutorialState,
      'debrisUnstable',
      TUTORIAL_MESSAGES.debrisUnstable,
    )
  }

  return showStickyTutorialHint(
    tutorialState,
    'debrisIntro',
    TUTORIAL_MESSAGES.debrisIntro,
  )
}

export function clearDebrisStickyHint(tutorialState) {
  if (!tutorialState?.stickyKey?.startsWith?.('debris')) return

  clearStickyTutorialHint(tutorialState)
}

export function resetTutorialHints(tutorialState) {
  if (!tutorialState) return

  tutorialState.repairHintShown = false
  tutorialState.towHintShown = false
  tutorialState.burnHintShown = false
  tutorialState.debrisIntroShown = false
  tutorialState.fuelLowHintShown = false
  clearStickyTutorialHint(tutorialState)
  clearTutorialHint(tutorialState)
}

export function updateTutorial(tutorialState, dt) {
  if (!tutorialState?.activeMessage) return

  tutorialState.messageTimer = Math.max(0, tutorialState.messageTimer - dt)

  if (tutorialState.messageTimer <= 0) {
    clearTutorialHint(tutorialState)
  }
}

function getTutorialCanvas(hud) {
  if (!hud) return null

  if (typeof hud.getContext === 'function') {
    return hud
  }

  return (
    hud.tutorialCanvas ||
    hud.infoHudCanvas ||
    hud.orbitHudCanvas ||
    hud.canvas ||
    null
  )
}

function wrapText(ctx, text, maxWidth) {
  const words = String(text || '').split(/\s+/).filter(Boolean)
  const lines = []
  let currentLine = ''

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    if (ctx.measureText(testLine).width <= maxWidth || !currentLine) {
      currentLine = testLine
    } else {
      lines.push(currentLine)
      currentLine = word
    }
  }

  if (currentLine) {
    lines.push(currentLine)
  }

  return lines.length > 0 ? lines : ['']
}

function drawRoundRect(ctx, x, y, width, height, radius) {
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath()
    ctx.roundRect(x, y, width, height, radius)
    ctx.fill()
    ctx.stroke()
    return
  }

  ctx.fillRect(x, y, width, height)
  ctx.strokeRect(x, y, width, height)
}

export function drawTutorialHint(hud, tutorialState) {
  if (!hud || !tutorialState?.enabled) return

  const activeMessage = tutorialState.stickyMessage || tutorialState.activeMessage
  if (!activeMessage) return

  const canvas = getTutorialCanvas(hud)
  const ctx = canvas?.getContext?.('2d')
  if (!ctx) return

  const width = canvas.width || window.innerWidth || 1280
  const height = canvas.height || window.innerHeight || 720
  const fadeOutDuration = Math.max(0.001, tutorialState.config.fadeOutDuration)
  const opacity = tutorialState.stickyMessage
    ? 1
    : Math.min(1, tutorialState.messageTimer / fadeOutDuration)
  const message = activeMessage
  const centerX = width / 2
  const centerY = height - (tutorialState.config.bottomOffset || 110)
  const maxTextWidth = Math.min(
    tutorialState.config.maxWidth,
    Math.max(260, width * 0.7),
  )

  ctx.save()
  ctx.globalAlpha = opacity
  ctx.font = '600 24px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const lines = wrapText(ctx, message, maxTextWidth)
  const lineHeight = 28
  const paddingX = 22
  const paddingY = 14
  const longestLineWidth = Math.max(
    ...lines.map((line) => ctx.measureText(line).width),
  )
  const boxWidth = longestLineWidth + paddingX * 2
  const boxHeight = lines.length * lineHeight + paddingY * 2
  const boxX = centerX - boxWidth / 2
  const boxY = centerY - boxHeight / 2

  ctx.fillStyle = 'rgba(4, 10, 18, 0.72)'
  ctx.strokeStyle = 'rgba(130, 210, 255, 0.55)'
  ctx.lineWidth = 1.5

  drawRoundRect(ctx, boxX, boxY, boxWidth, boxHeight, 10)

  ctx.fillStyle = 'rgba(225, 245, 255, 0.96)'
  lines.forEach((line, index) => {
    ctx.fillText(
      line,
      centerX,
      boxY + paddingY + lineHeight / 2 + index * lineHeight,
    )
  })
  ctx.restore()
}
