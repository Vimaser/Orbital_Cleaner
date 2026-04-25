

# Orbital Cleaner

Low orbit is a mess.

Satellites are failing, debris is everywhere, and someone has to go up there and fix it. That someone is you.

Orbital Cleaner is a fast paced, physics driven space maintenance game where you repair satellites, manage orbital debris, and try to stay profitable while a corporate system quietly drains your earnings.

## Core Gameplay

- Fly through a dense orbital field around a planet
- Lock onto and repair damaged satellites
- Capture and dispose of dangerous debris
- Manage fuel, heat, and positioning
- Chain actions together to build momentum

It is simple to pick up but quickly becomes a balancing act between control, efficiency, and survival.

## The Twist

During gameplay:
- You earn credits for every repair and cleanup task
- A running SHIFT total tracks what you have made during the current run

At the station terminal:
- Fees, damage, and "corporate adjustments" are applied
- Your earnings shrink, sometimes dramatically

You can end up in debt.

## Systems

- Flight System: orbital movement with boost and stabilization
- Heat System: flying too low causes atmospheric stress and burn up
- Fuel System: running out leads to heavy penalties
- Damage System: crashes, stress, and towing costs stack up
- Credit System: persistent balance with debt pressure
- Terminal System: animated, scrollable shift summaries
- Effects System: explosions and visual feedback for failures

## Controls

Keyboard
W A S D: Move
Mouse: Look and aim
Shift: Boost
Space: Stabilize
Esc: Pause

Gamepad
Left Stick: Move
Right Stick: Look and aim
RT or R2: Boost
LT or L2: Stabilize
Start: Pause

## Failure Matters

Burn up in the atmosphere results in damage costs.
Crash into satellites and you create more problems than you solve.
Run out of fuel and you will get towed.

Mistakes stack and they are not cheap.

## Current State

This project is in active development.

Working features:
- Core gameplay loop
- Satellite repair and debris handling
- Credit and debt system
- Terminal UI with animated output
- Floating reward feedback
- Crash and burn up effects

Planned improvements:
- More mission types
- Visual polish
- Economy tuning
- Additional hazards

## Tech

- JavaScript
- Three.js
- Custom systems, no full engine

## Installation

Clone the repo and run locally:

npm install
npm run dev

Then open it in your browser.

## Changelog

### v0.1.1 – Day 1 Patch

This patch focuses on stability, clarity, and making the game easier to understand without slowing it down.

**Gameplay / Guidance**
- Added contextual debris burn guidance (sticky hints)
- Improved clarity on how to initiate and maintain debris burns
- Added feedback for alignment and burn state changes

**Platform / Compatibility**
- Fixed fullscreen stretching issues (Wavedash + browser)
- Added MP4 fallback for training videos (Safari / iOS support)
- Improved audio reliability for menu music on embedded platforms

**UI / UX**
- Training videos now load more consistently across devices
- Guidance hints now clear properly when paused, in menus, or at terminals

**Credits**
- Added attribution for fallback Earth model used on Safari/mobile

---

### v0.1.0 – Game Jam Build

- Initial release for GameDevJS Jam
- Core gameplay loop (repair, debris handling, survival)
- Credit and debt system with terminal breakdown
- Flight, heat, fuel, and damage systems
- Visual effects for crashes and burn up

---

## Attribution

The following assets are used under the Creative Commons Attribution 4.0 License:

- "EARTH" (https://skfb.ly/6DxnV) by Stéphane Agullo
- "KSP: Primitive Orbital Station Complex" (https://skfb.ly/6UW9H) by Tanu Singh
- "moon" (https://skfb.ly/oFRLK) by RenderX
- "Dawn" (https://skfb.ly/6oPxY) by uperesito
- "Astronaut floating in space" (https://skfb.ly/6WMPY) by nitwit.friends
- "ISS" (https://skfb.ly/6oOBH) by uperesito
- "Earth | Terra - Downloadable model" (https://skfb.ly/X7P9) by murilo.kleine

All assets are licensed under Creative Commons Attribution (CC BY 4.0):
http://creativecommons.org/licenses/by/4.0/

"Earth | Terra - Downloadable model" is licensed under Creative Commons Attribution 4.0 (http://creativecommons.org/licenses/by/4.0/).

## License

MIT License. See LICENSE file for details.

## Final Note

This is a game about doing your job well and still somehow falling behind.

Keep flying. Try not to owe too much.