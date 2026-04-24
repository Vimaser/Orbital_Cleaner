const DEFAULT_TUTORIAL_CONFIG = {
  messageDuration: 4.2,
  fadeOutDuration: 0.65,
  bottomOffset: 110,
  maxWidth: 520,
}

const TUTORIAL_MESSAGES = {
  repair: 'Match alignment and hold steady to complete repairs.',
  tow: 'Hold steady. Lower orbit can burn debris down.',
  burn: 'Careful. Instability can snap the tow line.',
}

export function createTutorialState(config = {}) {
  return {
    enabled: true,
    repairHintShown: false,
    towHintShown: false,
    burnHintShown: false,
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

function showTutorialHint(tutorialState, key, message) {
  if (!tutorialState?.enabled || !message) return false

  tutorialState.activeKey = key
  tutorialState.activeMessage = message
  tutorialState.messageTimer = tutorialState.config.messageDuration
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

export function resetTutorialHints(tutorialState) {
  if (!tutorialState) return

  tutorialState.repairHintShown = false
  tutorialState.towHintShown = false
  tutorialState.burnHintShown = false
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
  if (!hud || !tutorialState?.enabled || !tutorialState.activeMessage) return

  const canvas = getTutorialCanvas(hud)
  const ctx = canvas?.getContext?.('2d')
  if (!ctx) return

  const width = canvas.width || window.innerWidth || 1280
  const height = canvas.height || window.innerHeight || 720
  const fadeOutDuration = Math.max(0.001, tutorialState.config.fadeOutDuration)
  const opacity = Math.min(1, tutorialState.messageTimer / fadeOutDuration)
  const message = tutorialState.activeMessage
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
