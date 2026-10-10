# Teamwork Project Prompt — Draft

> Status: Step 2 — confirming scope decisions with user
> Goal: Craft prompt → get user approval → delegate to agent team
> Requested team: multiple parallel subagents (user explicitly asked)

Pivot the `spatial-objects` hand-tracking sim into a **cartoon boxing game**:
a cute Nintendo-style NPC boxer in a ring, automatic footwork/pathfinding for
both fighters, and real-hand punches/blocks/dodges via webcam (hand size =
depth: bigger hand = closer to screen = punch).

Working directory: /home/ANT/unclockable-knighthacks-2026/spatial-objects
Approach policy: development (existing libs ok, copy conventions)
Save point: `backstop-pre-boxing` tag in both repos — break things freely.

## Requirements

### R1. Boxing game page
New `boxing.html` in spatial-objects, same conventions as job.html (self-contained
module page, vendored three.js via importmap, hands.js + face.js + glove.js,
mouse fallback, `window.__forceHands` synthetic-input test hook). Existing
pages must keep working.

### R2. Punch-Out-style fight
First-person-ish view: player's tracked hands render as boxing gloves on
screen; thrusting a hand toward the camera (landmark span grows) = punch.
Block = gloves up. Head sway (face.js nose.x) = dodge/lean. NPC boxer
telegraphs attacks, can be hit, blocks, and gets KO'd. HP/stamina, scoring,
round flow.

### R3. Auto pathfinding footwork
Both fighters move around the ring automatically (ring bounds, NPC
pursuit/circling/retreat, player drifts with sway). Player never manually
walks — pathfinding moves both.

### R4. Cohesive cute graphics
Everything matches the house style: warm paper bg, ink outlines, chunky
rounded forms, saturated accents — Nintendo/Punch-Out cute. Toon-shaded
boxer, cartoon ring, glove overlay recolored as boxing gloves.

### R5. Tests
Pure-logic modules node-testable; puppeteer smoke test drives the page via
`__forceHands` (pattern in test/jobverify.mjs, chromium at /usr/bin/chromium,
server on :8890).

## Acceptance Criteria

### Functional
- [ ] `node test/boxing-*.mjs` unit tests pass for fight logic, ring pathfinding, fist classification
- [ ] Puppeteer e2e: page loads with zero console errors, NPC visible in ring, synthetic punch event registers a hit on NPC
- [ ] Synthetic NPC attack → guard blocks or hit lands on player
- [ ] Both fighters auto-move; NPC closes distance over time; sway shifts player laterally
- [ ] `npm test` (existing suite) still passes — no regressions
- [ ] Visual cohesion check: single palette, no mixed-art-style assets

---
*Next: confirm 2 scope questions with user → write briefs → spawn team*
