# Story Blocks — Mockup 05

**Modality:** drag & drop (narrative sequencing / reading comprehension)

## What it demos

A tray of five shuffled story cards (hand-drawn inline-SVG scenes + short,
kid-readable captions) that the child drags into five numbered story slots:

1. Pip woke up
2. Pip found a golden key
3. The tree-door opened
4. Pip danced with the fireflies
5. Pip snuggled into bed

- Drag works with **Pointer Events**, so mouse and touch both work
  (tap-to-select is also supported: tap a card, then tap a slot).
- Cards snap into slots with a springy pop; occupied slots swap cards.
- **"Tell the story!"** runs the *Story Check*: a scan beam sweeps the slots.
  A wrong order gently shakes the offending cards and shows a smart-sounding
  hint (hardcoded rules — e.g. "can the door open before Pip finds the key?").
  A right order bursts confetti.
- The payoff stage then **plays the story back**: each scene animates as a
  CSS-keyframe vignette while its caption highlights karaoke-style, ending on
  "The End" plus a letter-gem reward ("K is for Key!"). "Shuffle & play again"
  resets the board.
- **"Watch it work"** runs a hands-free auto-demo: the cards glide into the
  correct order on their own, the Story Check fires, and the full payoff
  plays — no dragging required. A fixed **"Stop demo"** button stays on
  screen the whole time and bails out cleanly back to the manual board.
  It works repeatedly: run it after a manual game or another auto-demo.

## How to run

```bash
cd mockups
python3 -m http.server 8000
# open http://localhost:8000/05-story-blocks/
```

Plain HTML/CSS/vanilla JS — no build step. Google Fonts is the only external
dependency (with system-font fallbacks).

## How the real version works

In the shipping game, the "Story Check" is a **language-model story checker —
an LLM-based narrative AI**. Each card is tagged with its depicted events,
characters, and objects, and the model scores a child's ordering for causal
coherence — does the key exist before the door opens? Is the protagonist
awake? Instead of a binary right/wrong, the LLM finds the *first* causal
break in the sequence and turns it into a friendly, Socratic question
("Hmm — can the door open before Pip finds the key?"), so kids practise
reasoning about story structure rather than guessing. Because it is a
language model, it can also handle cards and captions kids invent
themselves — not just a fixed script — and it feeds comprehension signals
(how many tries, which kinds of mix-ups) into the game's reading-level
engine to adapt which stories and how many cards it offers next.
