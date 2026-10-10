# Type the Tale — Mockup 07

**Modality demoed:** keyboard typing (reading + typing practice as a
side-scrolling walk).

Pip, the kid-drawn monster, stands at the start of a paper-craft Storywood
scene. Five story words — **hop, log, bridge, moon, home** — float in chunky
bubbles along a winding stitched path that ends at a glowing storybook. The
keyboard is captured globally (no input to click; a hidden input is kept as a
mobile fallback). Each letter in the active bubble shows its state:
faint = upcoming, sun-yellow pill = current, ink = typed. A correct key gives a
soft tick and pops the letter in; a wrong key just wobbles that one letter with
a gentle red flash — you can never fail. Finishing a word makes Pip hop down
the path while the hills, trees and clouds parallax-shift past.

Hardcoded "adaptive tutor" flavor: after some words a tiny **Story Guide**
speech bubble appears from Pip ("You typed 'bridge' — bridges cross water!"),
and if the same letter is missed twice, the guide offers a hint ("Try 'g' — a
circle with a tail!"). A fake **reading level** star meter in the HUD fills one
star per word and upgrades its rank label (New Reader → Chapter Champ).
Reaching the book plays the payoff: "Chapter complete — you read the way
home!", a letter-gem award, a recap of the words typed, and a play-again reset.

**Hands-free demo:** a **Watch it play** button on the start card (and "Watch
it again" on the payoff) auto-types the whole run with a believable cadence —
jittered per-letter timing, a beat before each new word, and the occasional
neighboring-key slip that gets noticed and corrected. A "Stop demo" chip is
visible the whole time, and pressing any real key instantly hands control back
to the keyboard.

## How to run

Serve the `mockups/` folder and open this directory:

```bash
cd mockups/
python3 -m http.server 8000
# then visit http://localhost:8000/07-type-quest/
```

No build step, no dependencies — plain HTML/CSS/vanilla JS (Google Fonts only).

## How the real version would work

In the real game, the tutor is an adaptive AI — think the tech behind
TypingClub-style adaptive lessons or Google's Read Along: an on-device reading
model that keeps a per-child profile of letter accuracy, typing speed, and
which letter shapes get confused. It picks the next words at just the right
difficulty (decodable words for beginners, sight words and blends as skills
grow) and, when a kid stalls or repeats a mistake, chooses a targeted hint —
letter shape, sound, or a friendlier word — instead of a generic one. The
Story Guide lines, the reading-level meter, and the stuck-letter hints in this
mockup are hardcoded stand-ins for that adaptive loop; the typing, animation,
and payoff are all real front-end code.
