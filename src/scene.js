
import * as THREE from 'three'

const DESKTOP_MAX_RENDER_PIXEL_RATIO = 1.25
const MOBILE_MAX_RENDER_PIXEL_RATIO = 1

function isPhoneLikeDevice() {
  if (typeof window === 'undefined') return false

  const coarsePointer = window.matchMedia?.('(pointer: coarse)')?.matches
  const narrowScreen = Math.min(window.innerWidth, window.innerHeight) <= 760
  const touchPoints = navigator.maxTouchPoints > 0

  return Boolean((coarsePointer || touchPoints) && narrowScreen)
}

function getMaxRenderPixelRatio() {
  return isPhoneLikeDevice()
    ? MOBILE_MAX_RENDER_PIXEL_RATIO
    : DESKTOP_MAX_RENDER_PIXEL_RATIO
}

export function createScene() {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x000000)

  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  )

  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.0
  renderer.physicallyCorrectLights = true
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, getMaxRenderPixelRatio()))
  renderer.setSize(window.innerWidth, window.innerHeight, false)
  document.body.appendChild(renderer.domElement)

  function resizeScene() {
    const width = window.innerWidth
    const height = window.innerHeight

    camera.aspect = width / height
    camera.updateProjectionMatrix()

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, getMaxRenderPixelRatio()))
    renderer.setSize(width, height, false)
  }

  window.addEventListener('resize', resizeScene)
  document.addEventListener('fullscreenchange', () => {
    resizeScene()
    window.setTimeout(resizeScene, 150)
  })
  window.setTimeout(resizeScene, 150)

  const light = new THREE.DirectionalLight(0xffffff, 3.5)
  light.position.set(5, 10, 7)
  scene.add(light)

  const ambient = new THREE.AmbientLight(0x202030, 0.6)
  scene.add(ambient)

  return { scene, camera, renderer, resizeScene }
}