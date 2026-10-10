/* ============================================================
   Fill the Tale — Sticker Sky edition (css-doodle variant)

   Beats 0-5 of the shared spec:
   0. sticker-builder hero maker  →  1. blocked path (cross prop)
   2. rain (shelter prop)  →  3. river (ride prop)  →  4. dark cave
   (light prop)  →  5. home (open prop) + letter-gem + recap.

   Signature: every story event visibly RE-ROLLS the css-doodle sky,
   and the backdrop grammar itself changes per journey area:
   sunset field → rainy squiggles → wavy river → sparkle cave →
   morning meadow.
   ============================================================ */
(() => {
  "use strict";

  /* ---------- css-doodle bootstrap: CDN first, vendored fallback ---------- */
  if (window.customElements && !customElements.get("css-doodle")) {
    const s = document.createElement("script");
    s.src = "./css-doodle.min.js";
    document.head.appendChild(s);
  }

  const $ = (id) => document.getElementById(id);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  /* ============================ SKY GRAMMARS ============================ */
  /* One css-doodle grammar per journey area. Swapped + re-rolled per beat. */

  const SKIES = {
    sunset: `
      :doodle { @grid: 15x9 / 100% 100%; }
      @random(.05) {
        @size: @r(55%, 95%);
        background: #FFF3E0cc;
        border-radius: 50%;
        filter: blur(5px);
        opacity: .8;
        animation: drift @r(8s, 16s) ease-in-out @r(0s, 4s) infinite alternate;
      }
      @random(.4) {
        @size: @r(20%, 62%);
        background: @p(#FF6B57, #FF9F5A, #FFC53D, #FF8FA3, #FFFDF6, #B565D8);
        clip-path: @shape(@p(star, heart, bud, drop, clover, circle, windmill));
        rotate: @r(-35deg, 35deg);
        opacity: @r(.45, .92);
        animation: twinkle @r(2.6s, 6.5s) ease-in-out @r(0s, 4s) infinite;
      }
      @random(.07) {
        @size: @r(28%, 72%);
        background: none;
        clip-path: none;
        border: 2.5px dashed @p(#2B2118, #FF6B57, #B565D8, #FFFDF6);
        border-radius: 50%;
        opacity: .6;
        animation: spin @r(14s, 30s) linear infinite;
      }
      @row(9) {
        @size: 168%;
        background: @p(#4FB06D, #6BBF74, #3D9457, #8FD18A);
        clip-path: @shape(@p(bud, clover));
        opacity: .95;
        animation: sway @r(5s, 8s) ease-in-out @r(0s, 3s) infinite alternate;
      }
      @keyframes twinkle { 0%,100% { transform: scale(.68); } 50% { transform: scale(1.14); } }
      @keyframes spin { to { transform: rotate(360deg); } }
      @keyframes drift { from { transform: translate(-9%, 0); } to { transform: translate(10%, -4%); } }
      @keyframes sway { from { transform: rotate(-4deg); } to { transform: rotate(4deg); } }
    `,
    rain: `
      :doodle { @grid: 18x9 / 100% 100%; }
      @row(1, 2) @random(.34) {
        @size: @r(85%, 140%);
        background: #EAF4FBd9;
        border-radius: 50%;
        filter: blur(6px);
        opacity: .9;
        animation: drift @r(7s, 13s) ease-in-out @r(0s, 3s) infinite alternate;
      }
      @random(.5) {
        @size: @r(5%, 9%) @r(48%, 86%);
        background: @p(#C8EBFF, #8FD0FF, #FFFDF6, #A9D8F5);
        border-radius: 999px;
        rotate: 14deg;
        opacity: @r(.5, .9);
        animation: rainfall @r(.8s, 1.5s) linear @r(0s, 1.4s) infinite;
      }
      @random(.1) {
        @size: @r(24%, 42%);
        background: @p(#5DA9E9, #8FD0FF, #3D8BC9);
        clip-path: @shape(drop);
        opacity: .85;
        animation: rainfall @r(1s, 1.8s) linear @r(0s, 1.8s) infinite;
      }
      @row(9) @random(.7) {
        @size: @r(60%, 115%);
        background: @p(#5DA9E9, #7CC0EA, #4E97D8, #8FD0FF);
        clip-path: @shape(@p(bean, circle, bicorn));
        opacity: .9;
        animation: pud @r(2s, 4s) ease-in-out @r(0s, 2s) infinite alternate;
      }
      @keyframes rainfall { from { transform: translateY(-160%); } to { transform: translateY(420%); } }
      @keyframes drift { from { transform: translate(-8%, 0); } to { transform: translate(9%, 3%); } }
      @keyframes pud { from { transform: scale(.85); } to { transform: scale(1.1); } }
    `,
    river: `
      :doodle { @grid: 16x9 / 100% 100%; }
      @random(.06) {
        @size: @r(42%, 72%);
        background: @p(#FF9F5A, #FF8FA3, #FFC53D, #B565D8);
        clip-path: @shape(fish);
        opacity: .95;
        animation: swim @r(5s, 9s) ease-in-out @r(0s, 3s) infinite alternate;
      }
      @random(.2) {
        @size: @r(12%, 30%);
        background: @p(#C8EBFF, #8FD0FF, #FFFDF6);
        clip-path: @shape(circle);
        opacity: @r(.4, .8);
        animation: bubbleup @r(3s, 6s) ease-in @r(0s, 4s) infinite;
      }
      @random(.06) {
        @size: @r(14%, 26%);
        background: #FFFDF6;
        clip-path: @shape(star);
        opacity: .9;
        animation: twinkle @r(2s, 4s) ease-in-out infinite;
      }
      @row(4, 5, 6, 7, 8, 9) @random(.55) {
        @size: @r(50%, 96%);
        background: @p(#5DA9E9, #4E97D8, #7CC0EA, #8FD0FF);
        clip-path: @shape(@p(bean, bicorn, circle));
        opacity: @r(.35, .78);
        animation: wavey @r(2.6s, 4.4s) ease-in-out @r(0s, 3s) infinite alternate;
      }
      @keyframes swim {
        from { transform: translateX(-16%) rotate(-6deg); }
        to   { transform: translateX(16%) rotate(6deg); }
      }
      @keyframes bubbleup {
        0%   { transform: translateY(60%) scale(.5); opacity: 0; }
        30%  { opacity: .85; }
        100% { transform: translateY(-220%) scale(1.1); opacity: 0; }
      }
      @keyframes wavey { from { transform: translateY(-12%); } to { transform: translateY(12%); } }
      @keyframes twinkle { 0%,100% { transform: scale(.6); } 50% { transform: scale(1.15); } }
    `,
    cave: `
      :doodle { @grid: 16x9 / 100% 100%; }
      @row(1) @random(.9) {
        @size: 190%;
        background: @p(#191930, #212140, #151527);
        clip-path: @shape(triangle);
        rotate: 180deg;
        opacity: .96;
      }
      @row(9) @random(.9) {
        @size: 190%;
        background: @p(#191930, #212140, #151527);
        clip-path: @shape(triangle);
        opacity: .96;
      }
      @random(.3) {
        @size: @r(6%, 18%);
        background: @p(#FFFDF6, #FFC53D, #C8EBFF, #B565D8);
        clip-path: @shape(@p(star, circle));
        opacity: @r(.4, 1);
        animation: twinkle @r(1.8s, 5s) ease-in-out @r(0s, 3s) infinite;
      }
      @random(.05) {
        @size: @r(30%, 55%);
        background: @p(#B565D8, #FF8FA3, #5DA9E9);
        clip-path: @shape(@p(hypocycloid, pentagon, triangle));
        opacity: .75;
        animation: gleam @r(3s, 6s) ease-in-out @r(0s, 2s) infinite alternate;
      }
      @keyframes twinkle { 0%,100% { transform: scale(.55); opacity: .35; } 50% { transform: scale(1.2); opacity: 1; } }
      @keyframes gleam { from { filter: brightness(.8); } to { filter: brightness(1.5); } }
    `,
    meadow: `
      :doodle { @grid: 15x9 / 100% 100%; }
      @random(.05) {
        @size: @r(60%, 100%);
        background: #FFFFFFd9;
        border-radius: 50%;
        filter: blur(5px);
        opacity: .85;
        animation: drift @r(9s, 16s) ease-in-out @r(0s, 4s) infinite alternate;
      }
      @random(.4) {
        @size: @r(18%, 55%);
        background: @p(#FF8FA3, #FFC53D, #B565D8, #FF6B57, #FFFDF6, #5DA9E9);
        clip-path: @shape(@p(clover, bud, heart, star, circle));
        rotate: @r(-30deg, 30deg);
        opacity: @r(.5, .95);
        animation: twinkle @r(3s, 6s) ease-in-out @r(0s, 4s) infinite;
      }
      @random(.07) {
        @size: @r(16%, 30%);
        background: @p(#FF9F5A, #B565D8);
        clip-path: @shape(bicorn);
        rotate: 90deg;
        opacity: .8;
        animation: flutter @r(3s, 6s) ease-in-out @r(0s, 3s) infinite alternate;
      }
      @row(8, 9) {
        @size: @r(120%, 175%);
        background: @p(#4FB06D, #6BBF74, #3D9457, #8FD18A, #A5D68F);
        clip-path: @shape(@p(bud, clover));
        opacity: .95;
        animation: sway @r(4s, 7s) ease-in-out @r(0s, 3s) infinite alternate;
      }
      @keyframes twinkle { 0%,100% { transform: scale(.7); } 50% { transform: scale(1.12); } }
      @keyframes drift { from { transform: translate(-8%, 0); } to { transform: translate(10%, -4%); } }
      @keyframes sway { from { transform: rotate(-5deg); } to { transform: rotate(5deg); } }
      @keyframes flutter {
        from { transform: translate(-10%, -6%) rotate(-14deg); }
        to   { transform: translate(12%, 8%) rotate(14deg); }
      }
    `,
  };

  /* ============================ HERO DATA ============================ */

  const HERO_COLORS = [
    { body: "#4FB06D", dark: "#3D9457" },
    { body: "#5DA9E9", dark: "#3D8BC9" },
    { body: "#B565D8", dark: "#9648C2" },
    { body: "#FF8FA3", dark: "#E9687F" },
    { body: "#FF9F5A", dark: "#E57B33" },
  ];

  const BODIES = {
    round:  "M60 22 C92 22 106 48 106 78 C106 112 88 128 60 128 C32 128 14 112 14 78 C14 48 28 22 60 22 Z",
    tall:   "M60 14 C82 14 94 34 94 68 C94 104 80 128 60 128 C40 128 26 104 26 68 C26 34 38 14 60 14 Z",
    square: "M30 24 C30 18 34 16 60 16 C86 16 90 18 90 24 L96 96 C96 118 82 128 60 128 C38 128 24 118 24 96 Z",
    pear:   "M60 16 C76 16 84 30 84 46 C96 56 104 72 104 92 C104 116 86 130 60 130 C34 130 16 116 16 92 C16 72 24 56 36 46 C36 30 44 16 60 16 Z",
  };

  const hero = { body: "round", eyes: "big", hat: "antenna", color: 0 };

  /* ============================ PROP FACTORY ============================ */
  /* Every prop is an SVG "sticker" (white outline via CSS drop-shadows).
     Some embed a live css-doodle patch (sail pattern, firefly jar dots,
     door sparkle) so props are partly generated too. */

  const WOOD = ["#C98A54", "#B57A44", "#A96B3A", "#D89A62"];
  const SHADE = "#2B2118";

  const wood = () => pick(WOOD);
  const anyPal = () => pick(["#FF6B57", "#FFC53D", "#4FB06D", "#5DA9E9", "#B565D8", "#FF8FA3", "#FF9F5A"]);

  /* each builder returns { svg, w } — w = rendered width px on stage */
  const PROP_DEFS = {
    bridge: () => {
      const planks = [0, 1, 2, 3, 4].map((i) =>
        `<rect x="${38 + i * 30}" y="52" width="26" height="20" rx="6" fill="${wood()}" stroke="${SHADE}" stroke-width="3.5"/>`
      ).join("");
      return { w: 250, svg: `
        <svg viewBox="0 0 210 120">
          <path d="M12 86 Q105 20 198 86" fill="none" stroke="${SHADE}" stroke-width="12" stroke-linecap="round"/>
          <path d="M12 86 Q105 20 198 86" fill="none" stroke="${wood()}" stroke-width="7" stroke-linecap="round"/>
          <rect x="18" y="66" width="14" height="46" rx="5" fill="${wood()}" stroke="${SHADE}" stroke-width="3.5"/>
          <rect x="178" y="66" width="14" height="46" rx="5" fill="${wood()}" stroke="${SHADE}" stroke-width="3.5"/>
          ${planks}
        </svg>` };
    },
    log: () => ({ w: 210, svg: `
      <svg viewBox="0 0 200 90">
        <rect x="8" y="24" width="176" height="44" rx="22" fill="${wood()}" stroke="${SHADE}" stroke-width="4"/>
        <ellipse cx="16" cy="46" rx="12" ry="21" fill="#E8C898" stroke="${SHADE}" stroke-width="3.5"/>
        <ellipse cx="16" cy="46" rx="6" ry="12" fill="none" stroke="${SHADE}" stroke-width="2.5"/>
        <path d="M52 36 q10 6 20 0 M96 52 q10 6 20 0 M140 36 q10 6 20 0" fill="none" stroke="${SHADE}" stroke-width="2.5" stroke-linecap="round"/>
        <ellipse cx="150" cy="52" rx="7" ry="5" fill="#8B5E3C"/>
      </svg>` }),
    vine: () => ({ w: 120, svg: `
      <svg viewBox="0 0 120 160">
        <path d="M60 4 C52 40 70 70 58 104 C50 128 62 148 56 158" fill="none" stroke="#3D9457" stroke-width="8" stroke-linecap="round"/>
        ${[26, 52, 80, 108, 134].map((y, i) =>
          `<ellipse cx="${i % 2 ? 74 : 46}" cy="${y}" rx="16" ry="9" transform="rotate(${i % 2 ? 26 : -26} ${i % 2 ? 74 : 46} ${y})" fill="${i % 2 ? "#4FB06D" : "#6BBF74"}" stroke="${SHADE}" stroke-width="3"/>`
        ).join("")}
      </svg>` }),
    stones: () => ({ w: 230, svg: `
      <svg viewBox="0 0 220 70">
        <ellipse cx="36" cy="46" rx="30" ry="16" fill="#9A9AA8" stroke="${SHADE}" stroke-width="3.5"/>
        <ellipse cx="110" cy="38" rx="34" ry="17" fill="#B8B8C6" stroke="${SHADE}" stroke-width="3.5"/>
        <ellipse cx="184" cy="46" rx="30" ry="16" fill="#9A9AA8" stroke="${SHADE}" stroke-width="3.5"/>
        <ellipse cx="30" cy="40" rx="10" ry="4" fill="#CFCFDA"/>
        <ellipse cx="104" cy="32" rx="11" ry="4" fill="#DFDFE8"/>
        <ellipse cx="178" cy="40" rx="10" ry="4" fill="#CFCFDA"/>
      </svg>` }),
    ladder: () => ({ w: 140, svg: `
      <svg viewBox="0 0 120 150">
        <g transform="rotate(-6 60 75)">
          <rect x="24" y="6" width="10" height="140" rx="5" fill="${wood()}" stroke="${SHADE}" stroke-width="3.5"/>
          <rect x="86" y="6" width="10" height="140" rx="5" fill="${wood()}" stroke="${SHADE}" stroke-width="3.5"/>
          ${[24, 50, 76, 102, 126].map((y) =>
            `<rect x="34" y="${y}" width="52" height="9" rx="4.5" fill="${wood()}" stroke="${SHADE}" stroke-width="3"/>`
          ).join("")}
        </g>
      </svg>` }),
    tunnel: () => ({ w: 220, svg: `
      <svg viewBox="0 0 220 130">
        <path d="M20 124 L20 76 C20 36 60 14 110 14 C160 14 200 36 200 76 L200 124 Z" fill="#8A7B6A" stroke="${SHADE}" stroke-width="4"/>
        <path d="M58 124 L58 84 C58 58 82 44 110 44 C138 44 162 58 162 84 L162 124 Z" fill="#3A2E22"/>
        ${[[44, 70], [70, 38], [110, 26], [150, 38], [176, 70]].map(([x, y]) =>
          `<circle cx="${x}" cy="${y}" r="7" fill="#6E5F50" stroke="${SHADE}" stroke-width="2.5"/>`
        ).join("")}
      </svg>` }),
    boat: () => ({ w: 240, svg: `
      <svg viewBox="0 0 230 140">
        <path d="M18 78 L212 78 C204 116 168 128 115 128 C62 128 26 116 18 78 Z" fill="${pick(["#FF6B57", "#5DA9E9", "#FF9F5A"])}" stroke="${SHADE}" stroke-width="4" stroke-linejoin="round"/>
        <rect x="112" y="18" width="7" height="62" rx="3.5" fill="${wood()}" stroke="${SHADE}" stroke-width="3"/>
      </svg>` }),
    raft: () => ({ w: 220, svg: `
      <svg viewBox="0 0 220 110">
        ${[0, 1, 2, 3].map((i) =>
          `<rect x="${16 + i * 50}" y="60" width="44" height="24" rx="12" fill="${wood()}" stroke="${SHADE}" stroke-width="3.5"/>`
        ).join("")}
        <rect x="104" y="12" width="7" height="52" rx="3.5" fill="${wood()}" stroke="${SHADE}" stroke-width="3"/>
        <path d="M111 14 L160 26 L111 40 Z" fill="#FFC53D" stroke="${SHADE}" stroke-width="3" stroke-linejoin="round"/>
      </svg>` }),
    duck: () => ({ w: 200, svg: `
      <svg viewBox="0 0 200 130">
        <path d="M30 84 C30 58 58 48 92 52 C96 34 112 24 132 28 C152 32 160 46 156 62 C176 68 186 82 182 96 C176 116 130 122 92 118 C54 114 30 104 30 84 Z" fill="#FFC53D" stroke="${SHADE}" stroke-width="4"/>
        <circle cx="136" cy="46" r="20" fill="#FFC53D" stroke="${SHADE}" stroke-width="4"/>
        <path d="M154 46 L176 50 L154 60 Z" fill="#FF9F5A" stroke="${SHADE}" stroke-width="3.5" stroke-linejoin="round"/>
        <circle cx="140" cy="42" r="4" fill="${SHADE}"/>
        <path d="M58 78 Q84 62 110 78" fill="none" stroke="${SHADE}" stroke-width="3.5" stroke-linecap="round"/>
      </svg>` }),
    fish: () => ({ w: 210, svg: `
      <svg viewBox="0 0 210 120">
        <path d="M20 60 L52 34 L52 86 Z" fill="${anyPal()}" stroke="${SHADE}" stroke-width="4" stroke-linejoin="round"/>
        <ellipse cx="118" cy="60" rx="72" ry="42" fill="${anyPal()}" stroke="${SHADE}" stroke-width="4"/>
        <path d="M96 30 C106 12 130 12 138 28" fill="${anyPal()}" stroke="${SHADE}" stroke-width="3.5"/>
        <circle cx="160" cy="52" r="7" fill="#FFFDF6" stroke="${SHADE}" stroke-width="3"/>
        <circle cx="162" cy="53" r="3.5" fill="${SHADE}"/>
        <path d="M150 78 Q162 86 176 78" fill="none" stroke="${SHADE}" stroke-width="3.5" stroke-linecap="round"/>
        <path d="M84 44 Q92 60 84 76" fill="none" stroke="${SHADE}" stroke-width="3" stroke-linecap="round"/>
      </svg>` }),
    unicorn: () => {
      const t1 = pick(["#FFF3E0", "#FDE8F0", "#EAF5FF"]);
      const t2 = pick(["#F5DFC8", "#F8D3E0", "#D8ECF8"]);
      return { w: 270, svg: `
      <svg viewBox="0 0 260 150">
        <!-- paper-craft unicorn: folded-flat polygon facets -->
        <polygon points="60,70 130,58 128,102 64,110" fill="${t1}" stroke="${SHADE}" stroke-width="3.5" stroke-linejoin="round"/>
        <polygon points="60,70 96,58 96,104 64,110" fill="${t2}"/>
        <polygon points="128,58 168,44 182,66 158,88 130,102" fill="${t1}" stroke="${SHADE}" stroke-width="3.5" stroke-linejoin="round"/>
        <polygon points="168,44 198,52 188,74 158,88" fill="${t2}" stroke="${SHADE}" stroke-width="3.5" stroke-linejoin="round"/>
        <polygon points="186,50 200,14 206,50" fill="#FFC53D" stroke="${SHADE}" stroke-width="3" stroke-linejoin="round"/>
        <polygon points="200,52 216,58 202,68" fill="${t1}" stroke="${SHADE}" stroke-width="3" stroke-linejoin="round"/>
        <polygon points="150,48 128,30 138,56" fill="#FF8FA3" stroke="${SHADE}" stroke-width="3" stroke-linejoin="round"/>
        <polygon points="130,58 108,40 118,66" fill="#B565D8" stroke="${SHADE}" stroke-width="3" stroke-linejoin="round"/>
        <polygon points="60,70 34,52 44,84" fill="#FF8FA3" stroke="${SHADE}" stroke-width="3" stroke-linejoin="round"/>
        <rect x="72" y="104" width="12" height="34" rx="5" fill="${t2}" stroke="${SHADE}" stroke-width="3"/>
        <rect x="106" y="106" width="12" height="32" rx="5" fill="${t1}" stroke="${SHADE}" stroke-width="3"/>
        <rect x="140" y="100" width="12" height="38" rx="5" fill="${t2}" stroke="${SHADE}" stroke-width="3"/>
        <rect x="166" y="90" width="12" height="44" rx="5" fill="${t1}" stroke="${SHADE}" stroke-width="3"/>
        <circle cx="188" cy="62" r="4.5" fill="${SHADE}"/>
        <path d="M196 74 Q204 78 210 72" fill="none" stroke="${SHADE}" stroke-width="3" stroke-linecap="round"/>
      </svg>` };
    },
    umbrella: () => {
      const cols = [anyPal(), anyPal(), anyPal(), anyPal(), anyPal()];
      return { w: 175, svg: `
      <svg viewBox="0 0 170 140">
        ${[0, 1, 2, 3, 4].map((i) =>
          `<path d="M85 22 L${8 + i * 31} 74 Q${24 + i * 31} 62 ${39 + i * 31} 74 Z" fill="${cols[i]}" stroke="${SHADE}" stroke-width="3.5" stroke-linejoin="round"/>`
        ).join("")}
        <path d="M85 22 L8 74 M85 22 L162 74" stroke="${SHADE}" stroke-width="3.5"/>
        <circle cx="85" cy="18" r="7" fill="#FFC53D" stroke="${SHADE}" stroke-width="3"/>
        <path d="M85 22 L85 108 Q85 122 73 120 Q63 118 65 108" fill="none" stroke="${SHADE}" stroke-width="6" stroke-linecap="round"/>
      </svg>` };
    },
    hat: () => ({ w: 150, svg: `
      <svg viewBox="0 0 150 100">
        <path d="M30 66 C30 38 52 22 75 22 C98 22 120 38 120 66 Z" fill="${anyPal()}" stroke="${SHADE}" stroke-width="4"/>
        <ellipse cx="75" cy="68" rx="66" ry="12" fill="#FFC53D" stroke="${SHADE}" stroke-width="4"/>
        <path d="M56 40 q19 -10 38 0" fill="none" stroke="${SHADE}" stroke-width="3" stroke-linecap="round"/>
      </svg>` }),
    leaf: () => ({ w: 175, svg: `
      <svg viewBox="0 0 170 130">
        <path d="M16 112 C16 62 56 18 154 14 C158 78 118 118 46 118 C34 118 22 116 16 112 Z" fill="#4FB06D" stroke="${SHADE}" stroke-width="4"/>
        <path d="M30 106 C60 78 106 46 148 24" fill="none" stroke="${SHADE}" stroke-width="3" stroke-linecap="round"/>
        <path d="M58 88 L64 68 M88 68 L98 50 M116 50 L128 34" stroke="${SHADE}" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M16 112 Q8 118 6 126" fill="none" stroke="${SHADE}" stroke-width="4" stroke-linecap="round"/>
      </svg>` }),
    mushroom: () => ({ w: 160, svg: `
      <svg viewBox="0 0 160 130">
        <path d="M14 72 C14 36 48 14 80 14 C112 14 146 36 146 72 Z" fill="#FF6B57" stroke="${SHADE}" stroke-width="4"/>
        <circle cx="52" cy="44" r="9" fill="#FFFDF6"/>
        <circle cx="92" cy="32" r="7" fill="#FFFDF6"/>
        <circle cx="114" cy="52" r="8" fill="#FFFDF6"/>
        <path d="M62 72 L58 112 C58 120 66 124 80 124 C94 124 102 120 102 112 L98 72 Z" fill="#FFF3E0" stroke="${SHADE}" stroke-width="4"/>
      </svg>` }),
    lantern: () => ({ w: 140, svg: `
      <svg viewBox="0 0 120 150">
        <path d="M46 26 C46 12 74 12 74 26" fill="none" stroke="${SHADE}" stroke-width="5" stroke-linecap="round"/>
        <rect x="30" y="26" width="60" height="12" rx="6" fill="#5DA9E9" stroke="${SHADE}" stroke-width="3.5"/>
        <path d="M28 44 L92 44 L84 118 L36 118 Z" fill="#FFE9A8" stroke="${SHADE}" stroke-width="4" stroke-linejoin="round"/>
        <ellipse cx="60" cy="82" rx="13" ry="22" fill="#FFC53D" opacity=".9"/>
        <path d="M44 44 L40 118 M76 44 L80 118" stroke="${SHADE}" stroke-width="3"/>
        <rect x="34" y="118" width="52" height="12" rx="6" fill="#5DA9E9" stroke="${SHADE}" stroke-width="3.5"/>
      </svg>` }),
    torch: () => ({ w: 110, svg: `
      <svg viewBox="0 0 100 150">
        <path d="M50 14 C66 30 70 44 62 58 C74 52 80 40 76 28 C90 46 84 70 68 80 L32 80 C16 70 10 46 24 28 C20 40 26 52 38 58 C30 44 34 30 50 14 Z" fill="#FF9F5A" stroke="${SHADE}" stroke-width="3.5" stroke-linejoin="round"/>
        <path d="M50 34 C60 44 62 56 50 68 C38 56 40 44 50 34 Z" fill="#FFC53D"/>
        <rect x="38" y="80" width="24" height="58" rx="9" fill="${wood()}" stroke="${SHADE}" stroke-width="3.5"/>
      </svg>` }),
    fireflyjar: () => ({ w: 165, svg: `
      <svg viewBox="0 0 140 150">
        <rect x="38" y="10" width="64" height="20" rx="8" fill="#C98A54" stroke="${SHADE}" stroke-width="4"/>
        <path d="M28 36 L112 36 L118 126 C118 138 104 144 70 144 C36 144 22 138 22 126 Z" fill="rgba(200,235,255,.45)" stroke="${SHADE}" stroke-width="4"/>
        <path d="M40 50 Q46 90 40 124" fill="none" stroke="#FFFDF6" stroke-width="4" stroke-linecap="round" opacity=".8"/>
      </svg>` }),
    candle: () => ({ w: 110, svg: `
      <svg viewBox="0 0 100 150">
        <path d="M50 14 C62 28 64 40 50 52 C36 40 38 28 50 14 Z" fill="#FFC53D" stroke="${SHADE}" stroke-width="3.5"/>
        <path d="M50 26 C56 33 56 41 50 46 C44 41 44 33 50 26 Z" fill="#FF9F5A"/>
        <rect x="46" y="52" width="8" height="14" fill="${SHADE}"/>
        <rect x="26" y="64" width="48" height="74" rx="10" fill="#FFF3E0" stroke="${SHADE}" stroke-width="4"/>
        <path d="M26 80 q12 10 0 20 M74 76 q-10 12 0 24" fill="none" stroke="${SHADE}" stroke-width="2.5"/>
        <ellipse cx="50" cy="140" rx="34" ry="7" fill="#E8C898" stroke="${SHADE}" stroke-width="3"/>
      </svg>` }),
    flashlight: () => ({ w: 160, svg: `
      <svg viewBox="0 0 160 110">
        <path d="M96 26 L148 8 L148 96 L96 78 Z" fill="#FFE9A8" opacity=".55" stroke="${SHADE}" stroke-width="3" stroke-linejoin="round" stroke-dasharray="6 6"/>
        <rect x="18" y="34" width="72" height="36" rx="14" fill="#FF6B57" stroke="${SHADE}" stroke-width="4"/>
        <rect x="84" y="28" width="20" height="48" rx="8" fill="#3D8BC9" stroke="${SHADE}" stroke-width="4"/>
        <circle cx="46" cy="46" r="6" fill="#FFFDF6" stroke="${SHADE}" stroke-width="3"/>
      </svg>` }),
    door: () => ({ w: 190, svg: `
      <svg viewBox="0 0 170 180">
        <rect x="14" y="8" width="142" height="168" rx="16" fill="#8B5E3C" stroke="${SHADE}" stroke-width="4.5"/>
        <rect class="door-light" x="30" y="22" width="110" height="148" rx="10" fill="#FFE9A8"/>
        <g class="door-panel">
          <rect x="30" y="22" width="110" height="148" rx="10" fill="${pick(["#5DA9E9", "#FF6B57", "#4FB06D"])}" stroke="${SHADE}" stroke-width="4"/>
          <rect x="44" y="38" width="82" height="52" rx="8" fill="none" stroke="${SHADE}" stroke-width="3"/>
          <rect x="44" y="102" width="82" height="52" rx="8" fill="none" stroke="${SHADE}" stroke-width="3"/>
          <path d="M85 108 L88 117 L97 118 L90 124 L92 133 L85 128 L78 133 L80 124 L73 118 L82 117 Z" fill="#FFC53D" stroke="${SHADE}" stroke-width="2"/>
          <circle cx="126" cy="96" r="7" fill="#FFC53D" stroke="${SHADE}" stroke-width="3"/>
        </g>
      </svg>` }),
    key: () => ({ w: 150, svg: `
      <svg viewBox="0 0 150 110">
        <circle cx="34" cy="46" r="24" fill="none" stroke="#FFC53D" stroke-width="14"/>
        <circle cx="34" cy="46" r="24" fill="none" stroke="${SHADE}" stroke-width="4" style="paint-order:stroke"/>
        <rect x="54" y="39" width="84" height="14" rx="7" fill="#FFC53D" stroke="${SHADE}" stroke-width="3.5"/>
        <rect x="112" y="53" width="10" height="22" rx="4" fill="#FFC53D" stroke="${SHADE}" stroke-width="3.5"/>
        <rect x="128" y="53" width="10" height="16" rx="4" fill="#FFC53D" stroke="${SHADE}" stroke-width="3.5"/>
      </svg>` }),
    cookiejar: () => ({ w: 175, svg: `
      <svg viewBox="0 0 150 160">
        <g class="jar-cookie"><circle cx="70" cy="52" r="17" fill="#C98A54" stroke="${SHADE}" stroke-width="3.5"/>
          <circle cx="64" cy="48" r="3" fill="${SHADE}"/><circle cx="76" cy="54" r="3" fill="${SHADE}"/><circle cx="68" cy="58" r="2.5" fill="${SHADE}"/></g>
        <g class="jar-lid">
          <rect x="38" y="16" width="74" height="20" rx="10" fill="#5DA9E9" stroke="${SHADE}" stroke-width="4"/>
          <circle cx="75" cy="12" r="8" fill="#FFC53D" stroke="${SHADE}" stroke-width="3.5"/>
        </g>
        <path d="M28 40 L122 40 L130 128 C130 142 112 150 75 150 C38 150 20 142 20 128 Z" fill="rgba(200,235,255,.5)" stroke="${SHADE}" stroke-width="4"/>
        <circle cx="52" cy="106" r="13" fill="#C98A54" stroke="${SHADE}" stroke-width="3"/>
        <circle cx="92" cy="118" r="13" fill="#B57A44" stroke="${SHADE}" stroke-width="3"/>
        <circle cx="100" cy="88" r="12" fill="#C98A54" stroke="${SHADE}" stroke-width="3"/>
        <circle cx="50" cy="104" r="2.4" fill="${SHADE}"/><circle cx="95" cy="116" r="2.4" fill="${SHADE}"/><circle cx="102" cy="86" r="2.4" fill="${SHADE}"/>
      </svg>` }),
    /* ------- silly props ------- */
    peel: () => ({ w: 140, svg: `
      <svg viewBox="0 0 140 90">
        <path d="M70 30 C60 14 66 6 74 4 C78 14 76 24 70 30 Z" fill="#FFC53D" stroke="${SHADE}" stroke-width="3.5"/>
        <path d="M70 30 C44 34 26 52 22 76 C44 78 62 62 70 38 Z" fill="#FFE08A" stroke="${SHADE}" stroke-width="3.5" stroke-linejoin="round"/>
        <path d="M70 30 C96 34 114 52 118 76 C96 78 78 62 70 38 Z" fill="#FFC53D" stroke="${SHADE}" stroke-width="3.5" stroke-linejoin="round"/>
        <path d="M70 30 C64 50 66 66 70 80 C74 66 76 50 70 30 Z" fill="#FFE08A" stroke="${SHADE}" stroke-width="3.5"/>
      </svg>` }),
    toaster: () => ({ w: 165, svg: `
      <svg viewBox="0 0 160 120">
        <rect x="48" y="8" width="30" height="34" rx="6" fill="#E8C898" stroke="${SHADE}" stroke-width="3.5"/>
        <rect x="20" y="34" width="120" height="70" rx="18" fill="#B8B8C6" stroke="${SHADE}" stroke-width="4"/>
        <rect x="34" y="42" width="58" height="10" rx="5" fill="#4B4B55" stroke="${SHADE}" stroke-width="3"/>
        <rect x="128" y="56" width="8" height="26" rx="4" fill="${SHADE}"/>
        <circle cx="46" cy="80" r="7" fill="#FF6B57" stroke="${SHADE}" stroke-width="3"/>
        <rect x="30" y="104" width="14" height="8" rx="4" fill="${SHADE}"/>
        <rect x="116" y="104" width="14" height="8" rx="4" fill="${SHADE}"/>
      </svg>` }),
    fridge: () => ({ w: 160, svg: `
      <svg viewBox="0 0 140 160">
        <rect x="20" y="10" width="100" height="140" rx="14" fill="#D8ECF8" stroke="${SHADE}" stroke-width="4"/>
        <path d="M20 62 L120 62" stroke="${SHADE}" stroke-width="3.5"/>
        <rect x="30" y="26" width="8" height="24" rx="4" fill="${SHADE}"/>
        <rect x="30" y="74" width="8" height="30" rx="4" fill="${SHADE}"/>
        <path d="M88 34 L91 41 L98 42 L93 47 L94 54 L88 51 L82 54 L83 47 L78 42 L85 41 Z" fill="#FF6B57" stroke="${SHADE}" stroke-width="2"/>
        <circle cx="72" cy="96" r="8" fill="#FFC53D" stroke="${SHADE}" stroke-width="2.5"/>
      </svg>` }),
    mud: () => ({ w: 200, svg: `
      <svg viewBox="0 0 200 80">
        <ellipse cx="100" cy="52" rx="90" ry="24" fill="#8B5E3C" stroke="${SHADE}" stroke-width="4"/>
        <ellipse cx="60" cy="46" rx="18" ry="8" fill="#A1733F"/>
        <ellipse cx="140" cy="56" rx="14" ry="6" fill="#A1733F"/>
        <circle cx="96" cy="30" r="7" fill="#8B5E3C" stroke="${SHADE}" stroke-width="3"/>
        <circle cx="122" cy="24" r="5" fill="#A1733F" stroke="${SHADE}" stroke-width="2.5"/>
      </svg>` }),
    slime: () => ({ w: 160, svg: `
      <svg viewBox="0 0 150 120">
        <path d="M20 96 C10 60 34 30 75 30 C116 30 140 60 130 96 C122 110 102 112 75 112 C48 112 28 110 20 96 Z" fill="#7FD44F" stroke="${SHADE}" stroke-width="4"/>
        <path d="M34 96 q4 18 -6 24 M116 96 q-4 18 6 24" fill="none" stroke="#7FD44F" stroke-width="8" stroke-linecap="round"/>
        <circle cx="58" cy="66" r="8" fill="#FFFDF6" stroke="${SHADE}" stroke-width="3"/>
        <circle cx="92" cy="66" r="8" fill="#FFFDF6" stroke="${SHADE}" stroke-width="3"/>
        <circle cx="59" cy="67" r="3.5" fill="${SHADE}"/><circle cx="91" cy="67" r="3.5" fill="${SHADE}"/>
        <path d="M64 88 Q75 94 86 88" fill="none" stroke="${SHADE}" stroke-width="3" stroke-linecap="round"/>
      </svg>` }),
    sock: () => ({ w: 130, svg: `
      <svg viewBox="0 0 120 140">
        <path d="M40 14 L80 14 L80 74 C80 84 88 92 88 104 C88 118 76 126 60 124 C40 122 28 110 34 96 C38 86 40 78 40 66 Z" fill="#B8B8C6" stroke="${SHADE}" stroke-width="4"/>
        <path d="M40 32 L80 32 M40 46 L80 46" stroke="#FF6B57" stroke-width="6"/>
        <path d="M92 22 q10 -8 16 2 M96 38 q12 -6 16 6" fill="none" stroke="#7A8B4F" stroke-width="3" stroke-linecap="round"/>
      </svg>` }),
    ghost: () => ({ w: 150, svg: `
      <svg viewBox="0 0 140 150">
        <path d="M30 134 L30 70 C30 36 52 18 70 18 C88 18 110 36 110 70 L110 134 L96 122 L84 134 L70 122 L56 134 L44 122 Z" fill="#FFFDF6" stroke="${SHADE}" stroke-width="4" stroke-linejoin="round"/>
        <circle cx="56" cy="64" r="7" fill="${SHADE}"/><circle cx="86" cy="64" r="7" fill="${SHADE}"/>
        <ellipse cx="71" cy="88" rx="9" ry="12" fill="${SHADE}"/>
      </svg>` }),
    homework: () => ({ w: 150, svg: `
      <svg viewBox="0 0 140 130">
        <rect x="28" y="20" width="84" height="100" rx="6" transform="rotate(4 70 70)" fill="#FFFDF6" stroke="${SHADE}" stroke-width="3.5"/>
        <rect x="26" y="16" width="84" height="100" rx="6" transform="rotate(-3 68 66)" fill="#FFFDF6" stroke="${SHADE}" stroke-width="3.5"/>
        <path d="M42 44 L92 44 M42 58 L92 58 M42 72 L80 72" stroke="#A9A9B8" stroke-width="4" stroke-linecap="round"/>
        <text x="44" y="102" font-family="Patrick Hand, cursive" font-size="22" fill="#FF6B57">1 + 1 = ?</text>
      </svg>` }),
    spider: () => ({ w: 130, svg: `
      <svg viewBox="0 0 120 150">
        <path d="M60 4 L60 46" stroke="${SHADE}" stroke-width="3"/>
        <ellipse cx="60" cy="86" rx="26" ry="30" fill="#4B4B55" stroke="${SHADE}" stroke-width="4"/>
        <circle cx="60" cy="60" r="14" fill="#4B4B55" stroke="${SHADE}" stroke-width="3.5"/>
        ${[-1, 1].map((s) => [0, 1, 2, 3].map((i) =>
          `<path d="M${60 + s * 20} ${72 + i * 10} q${s * 22} ${-6 + i * 4} ${s * 34} ${6 + i * 8}" fill="none" stroke="${SHADE}" stroke-width="3.5" stroke-linecap="round"/>`
        ).join("")).join("")}
        <circle cx="55" cy="58" r="3.4" fill="#FFFDF6"/><circle cx="66" cy="58" r="3.4" fill="#FFFDF6"/>
      </svg>` }),
    stink: () => ({ w: 160, svg: `
      <svg viewBox="0 0 160 110">
        <ellipse cx="56" cy="66" rx="34" ry="24" fill="#8B6B4A" stroke="${SHADE}" stroke-width="4"/>
        <ellipse cx="96" cy="56" rx="30" ry="22" fill="#A1733F" stroke="${SHADE}" stroke-width="4"/>
        <ellipse cx="80" cy="40" rx="24" ry="18" fill="#8B6B4A" stroke="${SHADE}" stroke-width="4"/>
        <path d="M46 24 q8 -12 16 -2 M96 18 q8 -12 16 -2 M120 30 q10 -10 16 0" fill="none" stroke="#7A8B4F" stroke-width="3.5" stroke-linecap="round"/>
      </svg>` }),
    glue: () => ({ w: 160, svg: `
      <svg viewBox="0 0 160 110">
        <ellipse cx="80" cy="84" rx="66" ry="20" fill="#F5E7C8" stroke="${SHADE}" stroke-width="4"/>
        <g transform="rotate(28 112 52)">
          <rect x="96" y="28" width="32" height="52" rx="10" fill="#5DA9E9" stroke="${SHADE}" stroke-width="3.5"/>
          <path d="M104 28 L112 12 L120 28 Z" fill="#FF6B57" stroke="${SHADE}" stroke-width="3"/>
        </g>
        <ellipse cx="66" cy="80" rx="14" ry="5" fill="#FFFDF6" opacity=".8"/>
      </svg>` }),
    trash: () => ({ w: 150, svg: `
      <svg viewBox="0 0 140 140">
        <rect x="28" y="38" width="84" height="14" rx="7" transform="rotate(-8 70 45)" fill="#9A9AA8" stroke="${SHADE}" stroke-width="3.5"/>
        <path d="M32 52 L108 52 L102 132 C78 140 62 140 38 132 Z" fill="#B8B8C6" stroke="${SHADE}" stroke-width="4" stroke-linejoin="round"/>
        <path d="M48 64 L52 124 M70 66 L70 128 M92 64 L88 124" stroke="${SHADE}" stroke-width="3" opacity=".6"/>
        <path d="M112 24 q10 -10 16 2" fill="none" stroke="#7A8B4F" stroke-width="3" stroke-linecap="round"/>
      </svg>` }),
    undies: () => ({ w: 150, svg: `
      <svg viewBox="0 0 140 110">
        <path d="M18 26 L122 26 L118 56 C110 78 94 92 70 92 C46 92 30 78 22 56 Z" fill="#FFFDF6" stroke="${SHADE}" stroke-width="4" stroke-linejoin="round"/>
        <path d="M18 26 L122 26 L121 40 L19 40 Z" fill="#FF6B57" stroke="${SHADE}" stroke-width="3.5"/>
        <path d="M46 88 C50 70 90 70 94 88" fill="none" stroke="${SHADE}" stroke-width="3.5"/>
        <circle cx="50" cy="56" r="4" fill="#5DA9E9"/><circle cx="88" cy="56" r="4" fill="#5DA9E9"/><circle cx="70" cy="66" r="4" fill="#FFC53D"/>
      </svg>` }),
    tnt: () => ({ w: 140, svg: `
      <svg viewBox="0 0 130 130">
        ${[0, 1, 2].map((i) =>
          `<rect x="${26 + i * 28}" y="40" width="24" height="72" rx="8" fill="#FF6B57" stroke="${SHADE}" stroke-width="3.5"/>`
        ).join("")}
        <rect x="20" y="62" width="92" height="16" rx="6" fill="#8B5E3C" stroke="${SHADE}" stroke-width="3"/>
        <path d="M64 40 C64 28 74 24 78 14" fill="none" stroke="${SHADE}" stroke-width="3.5" stroke-linecap="round"/>
        <path d="M78 4 L80 11 L87 12 L81 16 L83 23 L78 19 L72 23 L74 16 L68 12 L75 11 Z" fill="#FFC53D" stroke="${SHADE}" stroke-width="1.5"/>
        <text x="48" y="104" font-family="Fredoka, sans-serif" font-weight="700" font-size="15" fill="#FFFDF6">TNT</text>
      </svg>` }),
    shark: () => ({ w: 220, svg: `
      <svg viewBox="0 0 220 110">
        <path d="M20 92 C40 60 90 44 160 48 C186 50 204 62 210 74 C186 88 130 96 78 96 C52 96 32 94 20 92 Z" fill="#7A8B9F" stroke="${SHADE}" stroke-width="4"/>
        <path d="M104 48 L122 10 L136 50 Z" fill="#7A8B9F" stroke="${SHADE}" stroke-width="4" stroke-linejoin="round"/>
        <circle cx="172" cy="62" r="5" fill="${SHADE}"/>
        <path d="M182 76 L200 74 M184 82 L198 84" stroke="${SHADE}" stroke-width="3" stroke-linecap="round"/>
        <path d="M184 72 Q194 78 190 86" fill="none" stroke="${SHADE}" stroke-width="3"/>
      </svg>` }),
    blob: () => ({ w: 140, svg: `
      <svg viewBox="0 0 140 120">
        <path d="M70 18 C100 18 122 42 122 72 C122 100 98 112 70 112 C42 112 18 100 18 72 C18 42 40 18 70 18 Z" fill="${anyPal()}" stroke="${SHADE}" stroke-width="4"/>
        <circle cx="54" cy="62" r="12" fill="#FFFDF6" stroke="${SHADE}" stroke-width="3"/>
        <circle cx="88" cy="58" r="9" fill="#FFFDF6" stroke="${SHADE}" stroke-width="3"/>
        <circle cx="56" cy="63" r="5" fill="${SHADE}"/><circle cx="89" cy="59" r="4" fill="${SHADE}"/>
        <path d="M58 86 Q70 80 82 86" fill="none" stroke="${SHADE}" stroke-width="3.5" stroke-linecap="round"/>
      </svg>` }),
    wordcard: (word) => ({ w: Math.min(220, 50 + word.length * 12), svg: `
      <svg viewBox="0 0 200 110">
        <rect x="10" y="16" width="180" height="82" rx="16" fill="#FFFDF6" stroke="${SHADE}" stroke-width="4"/>
        <rect x="58" y="4" width="84" height="20" rx="5" transform="rotate(-3 100 14)" fill="#FFE08A" stroke="${SHADE}" stroke-width="2.5" opacity=".9"/>
        <text x="100" y="72" text-anchor="middle" font-family="Patrick Hand, cursive" font-size="${word.length > 10 ? 22 : 30}" fill="${anyPal()}" stroke="${SHADE}" stroke-width=".8">${word}</text>
        <path d="M26 88 q10 -8 18 0 M156 30 q10 -8 18 0" stroke="${SHADE}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      </svg>` }),
  };

  /* ============================ BEAT DATA ============================ */

  const BEATS = [
    {
      area: 0, sky: "sunset", areaName: "Sunset Field", gag: "slip",
      title: "Pip needs to get through the forest! But the path is blocked —",
      pre: "Pip needs a", post: " to cross.",
      chips: ["bridge", "vine", "banana peel"],
      sensible: {
        "bridge": { prop: "bridge", line: "A sturdy sticker bridge pops in! Pip marches across." },
        "log": { prop: "log", line: "A fallen log! Pip tippy-toes over it." },
        "vine": { prop: "vine", line: "A jungle vine! Pip swings across — wheee!" },
        "ladder": { prop: "ladder", line: "A ladder! Pip climbs right over the block." },
        "tunnel": { prop: "tunnel", line: "A tunnel! Pip crawls through to the other side." },
        "stepping stones": { prop: "stones", line: "Stepping stones! Hop, hop, hop!" },
        "stones": { prop: "stones", line: "Stepping stones! Hop, hop, hop!" },
        "plank": { prop: "log", line: "A plank! Pip balances across, arms out wide." },
        "boat": { prop: "boat", line: "A boat? On grass? Pip rows across anyway!" },
        "raft": { prop: "raft", line: "A raft! Pip poles across the blocked path." },
      },
      auto: ["bridge"],
    },
    {
      area: 1, sky: "rain", areaName: "Rainy Squiggles", gag: "soggy",
      title: "Drip, drop — it started to rain!",
      pre: "The hero grabs a", post: ".",
      chips: ["umbrella", "big leaf", "paper bag"],
      sensible: {
        "umbrella": { prop: "umbrella", line: "Pop! A bright umbrella blooms over Pip." },
        "hat": { prop: "hat", line: "A rain hat! Pip stays mostly dry." },
        "leaf": { prop: "leaf", line: "A giant leaf umbrella! Clever Pip." },
        "big leaf": { prop: "leaf", line: "A giant leaf umbrella! Clever Pip." },
        "mushroom": { prop: "mushroom", line: "A mushroom parasol! Very Storywood." },
        "raincoat": { prop: "wordcard", line: "A squeaky yellow raincoat! Dry and dapper.", word: "raincoat" },
        "newspaper": { prop: "wordcard", line: "Newspaper hat! The headlines stay dry.", word: "newspaper" },
      },
      auto: ["umbrella"],
    },
    {
      area: 2, sky: "river", areaName: "Wavy River", gag: "splash",
      title: "A wide, wavy river blocks the way!",
      pre: "The hero rides the", post: " across.",
      chips: ["boat", "unicorn", "toaster"],
      sensible: {
        "boat": { prop: "boat", line: "A doodle-sail boat! Pip sails the wavy river." },
        "ship": { prop: "boat", line: "A grand ship! Captain Pip sets sail." },
        "unicorn": { prop: "unicorn", line: "A PAPER-CRAFT UNICORN! Pip climbs on and rides!" },
        "duck": { prop: "duck", line: "A giant rubber duck! Quack across we go." },
        "fish": { prop: "fish", line: "A big friendly fish! Pip rides the fin express." },
        "raft": { prop: "raft", line: "A trusty raft! Pip floats right over." },
        "whale": { prop: "fish", line: "A whale gives Pip a ride! Splash-tastic." },
        "canoe": { prop: "boat", line: "A canoe! Paddle, paddle, paddle." },
        "log": { prop: "log", line: "A floating log! Pip balances all the way across." },
      },
      auto: ["toaster", "unicorn"],
    },
    {
      area: 3, sky: "cave", areaName: "Sparkle Cave", gag: "fizzle",
      title: "The cave is dark — so dark! Something must glow…",
      pre: "The hero lights a", post: ".",
      chips: ["lantern", "firefly jar", "wet noodle"],
      sensible: {
        "lantern": { prop: "lantern", line: "A lantern! The whole cave twinkles hello." },
        "torch": { prop: "torch", line: "A blazing torch! Shadows run away." },
        "firefly jar": { prop: "fireflyjar", line: "A jar of fireflies! Generated glow-dots dance inside." },
        "fireflies": { prop: "fireflyjar", line: "Fireflies! A whole jar of living glitter." },
        "candle": { prop: "candle", line: "A candle! A tiny brave flame leads the way." },
        "flashlight": { prop: "flashlight", line: "A flashlight! Click — beam on." },
        "torchlight": { prop: "torch", line: "Torchlight! The cave sparkles back." },
        "glow stick": { prop: "flashlight", line: "Crack! A glow stick lights the dark." },
      },
      auto: ["firefly jar"],
    },
    {
      area: 4, sky: "meadow", areaName: "Morning Meadow", gag: "bonk",
      title: "Home at last! Morning is shining on the meadow —",
      pre: "The hero opens the", post: ".",
      chips: ["door", "cookie jar", "piano"],
      sensible: {
        "door": { prop: "door", line: "The door swings open — warm light spills out!" },
        "key": { prop: "key", line: "The golden key turns… click!" },
        "cookie jar": { prop: "cookiejar", line: "The cookie jar! Pop goes the lid — victory cookies!" },
        "cookie": { prop: "cookiejar", line: "The cookie jar! Pop goes the lid — victory cookies!" },
        "jar": { prop: "cookiejar", line: "The cookie jar! Pop goes the lid — victory cookies!" },
        "gate": { prop: "door", line: "The garden gate swings open — home sweet home!" },
        "drawbridge": { prop: "door", line: "The drawbridge lowers! Home at last!" },
        "book": { prop: "wordcard", line: "Pip opens the storybook — and the story opens too!", word: "book" },
      },
      auto: ["cookie jar"],
    },
  ];

  /* Silly words → spawned gag prop + caption. Any unknown word gets 'blob'. */
  const SILLY = {
    "banana peel": { prop: "peel", line: "Pip slipped on a banana peel! Wobble… down!" },
    "banana": { prop: "peel", line: "Pip slipped on a banana peel! Wobble… down!" },
    "peel": { prop: "peel", line: "Pip slipped on a banana peel! Wobble… down!" },
    "toaster": { prop: "toaster", line: "A toaster?! Splosh — Pip is soaked and toasty." },
    "fridge": { prop: "fridge", line: "A whole fridge! It bonks into the story. Pip reels." },
    "mud": { prop: "mud", line: "Squelch! Pip is stuck in the mud!" },
    "muddy": { prop: "mud", line: "Squelch! Pip is stuck in the mud!" },
    "slime": { prop: "slime", line: "Blorp! Pip got slimed!" },
    "stinky sock": { prop: "sock", line: "P.U.! That sock is so stinky Pip fell over!" },
    "sock": { prop: "sock", line: "P.U.! That sock is so stinky Pip fell over!" },
    "ghost": { prop: "ghost", line: "Eep! A ghost scared the stickers off Pip!" },
    "homework": { prop: "homework", line: "Homework?! Pip fainted on the spot." },
    "spider": { prop: "spider", line: "A spider! Pip jumped clean off the page!" },
    "poop": { prop: "stink", line: "Ewww! Pip stepped right in it!" },
    "poopy": { prop: "stink", line: "Ewww! Pip stepped right in it!" },
    "diaper": { prop: "stink", line: "A stinky diaper! Pip needs a clothespin!" },
    "fart": { prop: "stink", line: "That fart blew Pip clean off the page!" },
    "burp": { prop: "stink", line: "The burp knocked Pip flat!" },
    "glue": { prop: "glue", line: "Stick! Pip is glued to the ground!" },
    "trash": { prop: "trash", line: "Pip tumbled into the garbage can!" },
    "garbage": { prop: "trash", line: "Pip tumbled into the garbage can!" },
    "underwear": { prop: "undies", line: "Hee hee! Underwear! Pip laughed too hard to stand!" },
    "underpants": { prop: "undies", line: "Hee hee! Underpants! Pip laughed too hard to stand!" },
    "tnt": { prop: "tnt", line: "BOOM! The TNT launched Pip into next Tuesday!" },
    "bomb": { prop: "tnt", line: "BOOM! Pip got launched into next Tuesday!" },
    "quicksand": { prop: "mud", line: "Glub… Pip is sinking in quicksand!" },
    "shark": { prop: "shark", line: "Chomp! The shark chased Pip back to shore!" },
    "paper bag": { prop: "wordcard", word: "paper bag", line: "A paper bag melts in the rain. Soggy Pip!" },
    "toast": { prop: "toaster", line: "Soggy toast?! Pip is drenched AND disappointed." },
    "wet noodle": { prop: "blob", line: "A wet noodle fizzles out instantly. Poor Pip!" },
    "ice cream": { prop: "blob", line: "Ice cream?! Delicious, but zero help. Pip bonks." },
  };

  const RETRY_LINES = [
    "Pip dusts off. Try a nicer word?",
    "Pip shakes it off. Another word?",
    "Oof! Pip is okay. Try again!",
  ];

  /* ============================ DOM ============================ */

  const stage = $("stage");
  const skyEl = $("skyDoodle");
  const sunEl = $("sunDoodle");
  const catSvg = $("catSvg");
  const propLayer = $("propLayer");
  const heroRig = $("heroRig");
  const heroSvg = $("heroSvg");
  const dizzy = $("dizzyStars");
  const caption = $("reactCaption");
  const beatTitle = $("beatTitle");
  const sentPre = $("sentPre");
  const sentPost = $("sentPost");
  const wordInput = $("wordInput");
  const fillBtn = $("fillBtn");
  const form = $("sentenceForm");
  const chipsBox = $("wordChips");
  const didyouRow = $("didyouRow");
  const didyouChip = $("didyouChip");
  const taleWords = $("taleWords");
  const dotsBox = $("progressDots");
  const skyTag = $("skyTag");
  const newSkyBtn = $("newSkyBtn");
  const watchBtn = $("watchBtn");
  const watchLabel = $("watchLabel");
  const endingCard = $("endingCard");
  const recapList = $("recapList");
  const sillyRecap = $("sillyRecap");
  const playAgainBtn = $("playAgainBtn");
  const newHeroBtn = $("newHeroBtn");
  const makerPanel = $("makerPanel");
  const sentencePanel = $("sentencePanel");
  const surpriseBtn = $("surpriseBtn");
  const startBtn = $("startBtn");
  const bursts = { good: $("burstGood"), fail: $("burstFail"), splash: $("burstSplash"), smoke: $("burstSmoke") };

  /* ============================ STATE ============================ */

  let idx = 0;            // current beat
  let busy = false;       // a reaction is animating
  let over = false;       // chapter done
  let started = false;    // maker finished
  let auto = false;       // auto-demo running
  let autoRun = 0;        // invalidates stale auto steps
  let skyRolls = 0;       // how many times the sky re-rolled
  const chosen = BEATS.map(() => null);
  const oops = BEATS.map(() => []);

  const doodleUpdate = (el) => {
    if (el && typeof el.update === "function") {
      try { el.update(); } catch (e) { /* not upgraded yet */ }
    }
  };
  const doodleSet = (el, grammar) => {
    if (el && typeof el.update === "function") {
      try { el.update(grammar); return; } catch (e) { /* fall through */ }
    }
    if (el) el.textContent = grammar;
  };

  /* ============================ HERO BUILDER ============================ */

  function heroSvgMarkup() {
    const c = HERO_COLORS[hero.color];
    const b = BODIES[hero.body];
    const eyes = {
      big: `<g class="eyes-set" data-eyes="big">
          <circle cx="42" cy="70" r="12" fill="#FFFDF6" stroke="${SHADE}" stroke-width="3"/>
          <circle cx="78" cy="70" r="12" fill="#FFFDF6" stroke="${SHADE}" stroke-width="3"/>
          <circle cx="44" cy="72" r="4.5" fill="${SHADE}"/><circle cx="76" cy="72" r="4.5" fill="${SHADE}"/>
        </g>`,
      sleepy: `<g class="eyes-set" data-eyes="sleepy">
          <path d="M32 72 Q42 80 52 72" fill="none" stroke="${SHADE}" stroke-width="4" stroke-linecap="round"/>
          <path d="M68 72 Q78 80 88 72" fill="none" stroke="${SHADE}" stroke-width="4" stroke-linecap="round"/>
          <path d="M32 62 Q42 58 51 61 M69 61 Q78 58 88 62" fill="none" stroke="${SHADE}" stroke-width="3" stroke-linecap="round"/>
        </g>`,
      star: `<g class="eyes-set" data-eyes="star">
          <path d="M42 58 L45 66 L54 66.5 L47 71.5 L49.5 80 L42 75 L34.5 80 L37 71.5 L30 66.5 L39 66 Z" fill="#FFC53D" stroke="${SHADE}" stroke-width="2.5" stroke-linejoin="round"/>
          <path d="M78 58 L81 66 L90 66.5 L83 71.5 L85.5 80 L78 75 L70.5 80 L73 71.5 L66 66.5 L75 66 Z" fill="#FFC53D" stroke="${SHADE}" stroke-width="2.5" stroke-linejoin="round"/>
        </g>`,
      wink: `<g class="eyes-set" data-eyes="wink">
          <circle cx="42" cy="70" r="12" fill="#FFFDF6" stroke="${SHADE}" stroke-width="3"/>
          <circle cx="44" cy="72" r="4.5" fill="${SHADE}"/>
          <path d="M68 74 Q78 66 88 74" fill="none" stroke="${SHADE}" stroke-width="4.5" stroke-linecap="round"/>
        </g>`,
    };
    const hats = {
      antenna: `<g><path d="M60 24 C60 12 66 8 70 4" fill="none" stroke="${SHADE}" stroke-width="4" stroke-linecap="round"/>
        <circle cx="72" cy="5" r="7" fill="#FFC53D" stroke="${SHADE}" stroke-width="3.5"/></g>`,
      party: `<g><path d="M60 -6 L82 30 L38 30 Z" fill="#FF6B57" stroke="${SHADE}" stroke-width="3.5" stroke-linejoin="round" transform="translate(0,20)"/>
        <circle cx="60" cy="14" r="6" fill="#FFC53D" stroke="${SHADE}" stroke-width="3"/>
        <path d="M52 24 L68 24" stroke="#FFFDF6" stroke-width="4" stroke-linecap="round" transform="translate(0,6)"/></g>`,
      sprout: `<g><path d="M60 26 L60 10" stroke="${SHADE}" stroke-width="4" stroke-linecap="round"/>
        <path d="M60 14 C50 14 44 8 44 0 C54 0 60 6 60 14 Z" fill="#4FB06D" stroke="${SHADE}" stroke-width="3" stroke-linejoin="round"/>
        <path d="M60 11 C60 3 66 -2 74 -2 C74 6 68 11 60 11 Z" fill="#6BBF74" stroke="${SHADE}" stroke-width="3" stroke-linejoin="round"/></g>`,
      starclip: `<g transform="translate(24,4) rotate(-14)">
        <path d="M14 0 L17.5 9.5 L28 10 L20 16.5 L22.5 27 L14 21 L5.5 27 L8 16.5 L0 10 L10.5 9.5 Z" fill="#B565D8" stroke="${SHADE}" stroke-width="3" stroke-linejoin="round"/></g>`,
    };
    return `
      <!-- arms + feet behind body -->
      <ellipse cx="16" cy="86" rx="11" ry="8" transform="rotate(24 16 86)" fill="${c.dark}" stroke="${SHADE}" stroke-width="3.5"/>
      <ellipse cx="104" cy="86" rx="11" ry="8" transform="rotate(-24 104 86)" fill="${c.dark}" stroke="${SHADE}" stroke-width="3.5"/>
      <ellipse cx="42" cy="132" rx="13" ry="8" fill="${c.dark}" stroke="${SHADE}" stroke-width="3.5"/>
      <ellipse cx="78" cy="132" rx="13" ry="8" fill="${c.dark}" stroke="${SHADE}" stroke-width="3.5"/>
      <path d="${b}" fill="${c.body}" stroke="${SHADE}" stroke-width="4"/>
      ${hats[hero.hat]}
      ${eyes[hero.eyes]}
      <g class="dizzy-face">
        <g stroke="${SHADE}" stroke-width="4" stroke-linecap="round">
          <path d="M34 64 L50 78 M50 64 L34 78"/>
          <path d="M70 64 L86 78 M86 64 L70 78"/>
        </g>
        <ellipse cx="60" cy="102" rx="8" ry="10" fill="${SHADE}"/>
      </g>
      <g class="mouth-set active">
        <path d="M46 98 Q60 110 74 98" fill="none" stroke="${SHADE}" stroke-width="4" stroke-linecap="round"/>
        <ellipse cx="34" cy="88" rx="7" ry="4.5" fill="#FF8FA3" opacity=".75"/>
        <ellipse cx="86" cy="88" rx="7" ry="4.5" fill="#FF8FA3" opacity=".75"/>
      </g>`;
  }

  function renderHero() {
    heroSvg.innerHTML = heroSvgMarkup();
    heroSvg.querySelectorAll(".eyes-set").forEach((e) => {
      e.classList.toggle("active", e.dataset.eyes === hero.eyes);
    });
  }

  /* maker swatch wiring */
  function syncSwatches() {
    document.querySelectorAll(".opt-row").forEach((row) => {
      const g = row.dataset.group;
      row.querySelectorAll(".swatch").forEach((b) => {
        b.classList.toggle("sel", String(hero[g]) === b.dataset.opt);
      });
    });
  }

  function setHeroOpt(group, value, popEl) {
    hero[group] = group === "color" ? Number(value) : value;
    renderHero();
    syncSwatches();
    if (popEl) {
      popEl.classList.remove("picked");
      void popEl.offsetWidth;
      popEl.classList.add("picked");
    }
    heroRig.classList.remove("happy");
    void heroRig.offsetWidth;
    heroRig.classList.add("happy");
  }

  document.querySelectorAll(".swatch").forEach((b) => {
    b.addEventListener("click", () => {
      if (auto) return;
      setHeroOpt(b.closest(".opt-row").dataset.group, b.dataset.opt, b);
    });
  });

  function surpriseMe(popEls) {
    const groups = { body: Object.keys(BODIES), eyes: ["big", "sleepy", "star", "wink"], hat: ["antenna", "party", "sprout", "starclip"], color: [0, 1, 2, 3, 4] };
    Object.entries(groups).forEach(([g, opts]) => {
      const v = pick(opts);
      hero[g] = v;
      if (popEls) {
        const el = document.querySelector(`.opt-row[data-group="${g}"] .swatch[data-opt="${v}"]`);
        if (el) { el.classList.remove("picked"); void el.offsetWidth; el.classList.add("picked"); }
      }
    });
    renderHero();
    syncSwatches();
    heroRig.classList.remove("happy");
    void heroRig.offsetWidth;
    heroRig.classList.add("happy");
  }

  /* ============================ CONSTELLATION CRITTER ============================ */
  /* A "sky cat" — base outline points jittered per re-roll, star-nodes joined
     by dashed lines. Regenerates with the sky. */

  const CAT_POINTS = [
    /* head w/ ears */ [60, 46], [58, 26], [72, 16], [84, 30], [98, 28], [110, 14], [120, 30], [118, 48],
    /* cheeks → body */ [104, 60], [112, 82], [100, 104], [76, 110], [54, 104], [46, 84], [52, 62],
    /* tail curl */ [46, 84], [28, 92], [18, 78], [26, 62], [36, 64],
  ];
  const CAT_EDGES = [
    [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 0],      // head+ears
    [7, 8], [8, 9], [9, 10], [10, 11], [11, 12], [12, 13], [13, 14], [14, 0], // body
    [15, 16], [16, 17], [17, 18], [18, 19],                              // tail
  ];
  const CAT_EYES = [[78, 44], [96, 42]];

  function genCat() {
    const pts = CAT_POINTS.map(([x, y]) => [x + (Math.random() * 12 - 6), y + (Math.random() * 12 - 6)]);
    const star = (cx, cy, r, fill, cls, delay) =>
      `<path class="cat-star ${cls}" style="animation-delay:${delay}s" transform="translate(${cx.toFixed(1)} ${cy.toFixed(1)})"
        d="M0 ${-r} L${r * .26} ${-r * .26} L${r} 0 L${r * .26} ${r * .26} L0 ${r} L${-r * .26} ${r * .26} L${-r} 0 L${-r * .26} ${-r * .26} Z"
        fill="${fill}" stroke="${SHADE}" stroke-width="1.4"/>`;
    let out = `<path class="cat-lines" d="` +
      CAT_EDGES.map(([a, b]) => `M${pts[a][0].toFixed(1)} ${pts[a][1].toFixed(1)} L${pts[b][0].toFixed(1)} ${pts[b][1].toFixed(1)}`).join(" ") +
      `"/>`;
    pts.forEach(([x, y], i) => {
      out += star(x, y, 4 + Math.random() * 3, i % 3 ? "#FFFDF6" : "#FFC53D", "", (-(Math.random() * 3)).toFixed(2));
    });
    CAT_EYES.forEach(([x, y]) => {
      out += star(x + (Math.random() * 4 - 2), y + (Math.random() * 4 - 2), 9, "#FFC53D", "eye", (-(Math.random() * 2)).toFixed(2));
    });
    catSvg.innerHTML = out;
  }

  /* ============================ WORD LOGIC ============================ */

  function normalize(raw) {
    return raw.trim().toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/^(a|an|the|some|my|his|her|its|big|giant|little)\s+/, "");
  }

  function looksLikeWord(w) {
    if (!/^[a-z][a-z '\u2019-]*$/.test(w)) return false;
    const core = w.replace(/[^a-z]/g, "");
    if (core.length < 2) return false;
    if (/(.)\1\1/.test(core)) return false;
    if (!/[aeiouy]/.test(core)) return false;
    const vowels = (core.match(/[aeiouy]/g) || []).length;
    if (vowels / core.length < 0.12) return false;
    return true;
  }

  function lev(a, b) {
    const m = a.length, n = b.length;
    if (!m) return n; if (!n) return m;
    const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
    for (let j = 1; j <= n; j++) d[0][j] = j;
    for (let i = 1; i <= m; i++)
      for (let j = 1; j <= n; j++)
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[m][n];
  }

  function didYouMean(w) {
    const keys = Object.keys(BEATS[idx].sensible);
    let best = null, bestD = Infinity;
    for (const k of keys) {
      const d = lev(w, k);
      if (d < bestD) { bestD = d; best = k; }
    }
    const ok = bestD <= (best && best.length >= 6 ? 3 : best && best.length >= 4 ? 2 : 1);
    return ok ? best : null;
  }

  function classify(raw) {
    const w = normalize(raw);
    if (!w) return { type: "empty" };
    const beat = BEATS[idx];
    if (beat.sensible[w]) return { type: "good", word: w, entry: beat.sensible[w] };
    const sillyKey = Object.keys(SILLY).find((k) => k === w || w.includes(k) || (w.length >= 3 && k.includes(w)));
    if (sillyKey) return { type: "silly", word: w, entry: SILLY[sillyKey] };
    if (!looksLikeWord(w)) return { type: "nonword" };
    const mean = didYouMean(w);
    if (mean) return { type: "almost", word: w, mean };
    return { type: "silly", word: w, entry: { prop: "wordcard", word: w, line: `\u201C${w}\u201D?! The Sticker Sky bonks Pip for that one!` } };
  }

  /* ============================ UI PIECES ============================ */

  function setCaption(text, kind) {
    caption.textContent = text;
    caption.classList.remove("good", "bad", "pop");
    if (kind) caption.classList.add(kind);
    void caption.offsetWidth;
    caption.classList.add("pop");
  }

  function showBurst(el, ms) {
    doodleUpdate(el);
    el.classList.add("show");
    setTimeout(() => el.classList.remove("show"), ms);
  }

  function shockFlipSky() {
    stage.classList.add("shock");
    setTimeout(() => {
      doodleUpdate(skyEl);   // regenerate the whole sky mid-flash — the signature
      doodleUpdate(sunEl);
      genCat();
      tagSky();
    }, 240);
    setTimeout(() => stage.classList.remove("shock"), 620);
  }

  function heroState(cls, ms) {
    heroRig.classList.remove("happy", "slip", "soggy", "fizzleface", "wobble", "walking", "entering");
    if (cls) heroRig.classList.add(cls);
    if (ms) setTimeout(() => heroRig.classList.remove(cls), ms);
  }

  function setDizzy(on) {
    dizzy.classList.toggle("on", on);
    heroSvg.classList.toggle("dizzy", on);
  }

  function autosizeInput() {
    wordInput.size = Math.max(5, Math.min(22, wordInput.value.length || 5));
  }

  function setInteractive(on) {
    wordInput.disabled = !on;
    fillBtn.disabled = !on;
    chipsBox.querySelectorAll("button").forEach((b) => (b.disabled = !on));
  }

  function hideDidyou() { didyouRow.hidden = true; }

  function showDidyou(word) {
    didyouChip.textContent = `\u201C${word}\u201D`;
    didyouChip.onclick = () => {
      hideDidyou();
      wordInput.value = word;
      autosizeInput();
      submit(word);
    };
    didyouRow.hidden = false;
  }

  function renderDots() {
    dotsBox.innerHTML = "";
    BEATS.forEach((_, i) => {
      const d = document.createElement("span");
      d.className = "pdot" + (i < idx ? " done" : i === idx && !over && started ? " now" : "");
      dotsBox.appendChild(d);
    });
  }

  function renderChips() {
    chipsBox.innerHTML = "";
    BEATS[idx].chips.forEach((w) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "word-chip";
      b.textContent = w;
      b.addEventListener("click", () => {
        if (busy || over || auto) return;
        wordInput.value = w;
        autosizeInput();
        submit(w);
      });
      chipsBox.appendChild(b);
    });
  }

  function renderSentence() {
    const s = BEATS[idx];
    beatTitle.textContent = s.title;
    sentPre.textContent = s.pre;
    sentPost.textContent = s.post;
    wordInput.value = "";
    autosizeInput();
    hideDidyou();
    renderChips();
    renderDots();
    setCaption("Give Pip a word!", "");
    if (!auto) wordInput.focus({ preventScroll: true });
  }

  function pushTaleWord(word, cls) {
    const empty = taleWords.querySelector(".tale-empty");
    if (empty) empty.remove();
    const chip = document.createElement("span");
    chip.className = "tale-word " + cls;
    chip.style.transform = `rotate(${(Math.random() * 4 - 2).toFixed(1)}deg)`;
    chip.textContent = word;
    taleWords.appendChild(chip);
  }

  /* ============================ PROPS & CHOREO ============================ */

  function spawnProp(key, opts = {}) {
    const def = PROP_DEFS[key] ? PROP_DEFS[key](opts.word) : PROP_DEFS.blob();
    const el = document.createElement("div");
    el.className = "prop";
    el.style.width = (opts.w || def.w) + "px";
    el.style.left = (opts.left ?? 50) + "%";
    el.style.bottom = (opts.bottom ?? 20) + "%";
    el.innerHTML = def.svg;
    propLayer.appendChild(el);
    if (opts.extra) opts.extra(el);
    void el.offsetWidth;
    requestAnimationFrame(() => el.classList.add("in"));
    return el;
  }

  function clearProps(instant) {
    propLayer.querySelectorAll(".prop").forEach((p) => {
      if (instant) p.remove();
      else { p.classList.add("out"); setTimeout(() => p.remove(), 500); }
    });
  }

  /* firefly jar gets a live css-doodle of glow dots inside */
  function jarDoodle(el) {
    const d = document.createElement("css-doodle");
    d.className = "prop-doodle jar-doodle";
    el.appendChild(d);
    doodleSet(d, `
      :doodle { @grid: 6x7 / 100% 100%; }
      @random(.5) {
        @size: @r(10%, 22%);
        background: @p(#FFE066, #FFC53D, #FFFDF6);
        clip-path: @shape(circle);
        filter: drop-shadow(0 0 4px #FFC53D);
        animation: flicker @r(1.4s, 3s) ease-in-out @r(0s, 2s) infinite alternate;
      }
      @keyframes flicker {
        from { opacity: .15; transform: scale(.6) translate(@r(-8%,8%), @r(-8%,8%)); }
        to   { opacity: 1;   transform: scale(1.1) translate(@r(-8%,8%), @r(-8%,8%)); }
      }
    `);
  }

  /* boat gets a generated polka-dot sail */
  function sailDoodle(el) {
    const d = document.createElement("css-doodle");
    d.className = "prop-doodle";
    d.style.cssText = "left:52%; top:4%; width:34%; height:52%; clip-path:polygon(0 0, 100% 100%, 0 100%);";
    el.appendChild(d);
    doodleSet(d, `
      :doodle { @grid: 4x5 / 100% 100%; }
      @random(.55) {
        @size: @r(30%, 60%);
        background: @p(#FFFDF6, #FFC53D, #FF8FA3);
        clip-path: @shape(@p(circle, star, heart));
        opacity: .95;
      }
    `);
  }

  const PROP_FX = { fireflyjar: jarDoodle, boat: sailDoodle };

  function moveHero(leftPct, bottomPct) {
    heroRig.style.left = leftPct + "%";
    if (bottomPct != null) heroRig.style.bottom = bottomPct + "%";
  }

  function heroLeft() {
    return parseFloat(heroRig.style.left || "12");
  }

  /* ============================ REACTIONS ============================ */

  /* --- success: prop spawns, hero acts it out, story advances --- */
  async function reactGood(word, entry) {
    busy = true;
    setInteractive(false);
    hideDidyou();
    const beat = BEATS[idx];
    const propKey = entry.prop;
    const spawnAt = idx === 4 ? 72 : 50;

    setCaption(entry.line, "good");
    const prop = spawnProp(propKey, {
      left: spawnAt,
      bottom: idx === 2 ? 8 : idx === 3 ? 16 : 18,
      word: entry.word,
      extra: PROP_FX[propKey],
    });
    showBurst(bursts.good, 1100);
    heroState("happy", 850);
    shockFlipSky();
    await sleep(900);

    if (idx === 0) {
      /* cross the prop */
      heroState("walking");
      moveHero(84);
      await sleep(1600);
      heroState(null);
      prop.classList.add("out");
    } else if (idx === 1) {
      /* prop flies overhead, hero walks on sheltered */
      prop.style.transitionDuration = "1.5s";
      prop.style.left = heroLeft() + "%";
      prop.style.bottom = "46%";
      await sleep(750);
      heroState("walking");
      moveHero(80);
      prop.style.left = "80%";
      await sleep(1600);
      heroState(null);
      prop.classList.add("out");
    } else if (idx === 2) {
      /* ride: float prop in, mount, drift across together */
      prop.classList.add("riding");
      prop.style.left = "34%";
      await sleep(800);
      heroState("walking");
      moveHero(38);
      await sleep(1300);
      heroState(null);
      moveHero(42, 30);            // mount: rise onto the prop
      prop.style.left = "44%";
      await sleep(700);
      prop.style.transitionDuration = "1.9s";
      heroRig.style.transitionDuration = "1.9s";
      prop.style.left = "88%";
      moveHero(84, 30);            // ride across together
      await sleep(2000);
      heroRig.style.transitionDuration = "";
      moveHero(80, 13);            // hop off onto the far bank
      prop.classList.add("out");
      await sleep(700);
      heroState(null);
    } else if (idx === 3) {
      /* light: glow the cave, carry the light across */
      prop.classList.add("glowing");
      stage.classList.add("lit");
      prop.style.left = heroLeft() + 4 + "%";
      prop.style.bottom = "46%";
      await sleep(900);
      heroState("walking");
      moveHero(78);
      prop.style.left = "78%";
      await sleep(1600);
      heroState(null);
      prop.classList.add("out");
    } else {
      /* home: walk to the prop, open it */
      heroState("walking");
      moveHero(64);
      await sleep(1400);
      heroState(null);
      if (propKey === "key") {
        prop.classList.add("key-turn");
        const door = spawnProp("door", { left: 78, bottom: 16 });
        await sleep(600);
        prop.classList.add("out");
        door.classList.add("door-open");
      } else if (propKey === "cookiejar") {
        prop.classList.add("jar-open");
        showBurst(bursts.good, 1100);
      } else {
        prop.classList.add("door-open");
      }
      await sleep(900);
      heroState("entering");
      await sleep(900);
    }

    chosen[idx] = word;
    pushTaleWord(word, "good");
    busy = false;
    advance();
  }

  /* --- silly: a REAL prop spawns and does the gag --- */
  async function reactFail(word, entry) {
    busy = true;
    setInteractive(false);
    hideDidyou();
    const beat = BEATS[idx];
    oops[idx].push(word);
    pushTaleWord(word, "oops");
    const gag = beat.gag;
    const propKey = entry.prop || "blob";
    setCaption(entry.line, "bad");

    if (gag === "slip" && propKey === "peel") {
      /* the peel literally slides underfoot */
      const p = spawnProp("peel", { left: 20, bottom: 11 });
      await sleep(450);
      p.classList.add("peel-slide");
      p.style.left = heroLeft() + "%";
      await sleep(550);
      heroState("slip");
    } else if (gag === "splash") {
      const p = spawnProp(propKey, { left: 50, bottom: 60, word: entry.word });
      await sleep(380);
      p.classList.add("splashdown");
      p.style.bottom = "4%";
      showBurst(bursts.splash, 1200);
      heroState("soggy");
      setDizzy(true);
      await sleep(500);
    } else if (gag === "soggy") {
      const p = spawnProp(propKey, { left: heroLeft() + 8, bottom: 34, word: entry.word });
      showBurst(bursts.splash, 1200);
      await sleep(500);
      p.classList.add("soggy");
      heroState("soggy");
      setDizzy(true);
    } else if (gag === "fizzle") {
      const p = spawnProp(propKey, { left: 50, bottom: 26, word: entry.word });
      await sleep(420);
      p.classList.add("fizzled");
      showBurst(bursts.smoke, 1300);
      heroState("fizzleface");
      setDizzy(true);
    } else {
      /* slip/bonk on land */
      const p = spawnProp(propKey, { left: heroLeft() + 14, bottom: 14, word: entry.word });
      await sleep(480);
      heroState("slip");
      showBurst(bursts.fail, 1300);
      setDizzy(true);
    }

    if (gag !== "splash") showBurst(gag === "fizzle" ? bursts.smoke : bursts.fail, 1300);
    setDizzy(true);
    setTimeout(shockFlipSky, 380);       // sky regenerates in shock — signature
    await sleep(2100);

    setDizzy(false);
    heroState(null);
    clearProps(false);
    setCaption(pick(RETRY_LINES), "");
    busy = false;
    if (!auto && !over) setInteractive(true);
    if (!auto) wordInput.focus({ preventScroll: true });
  }

  function reactWobble() {
    busy = true;
    setInteractive(false);
    hideDidyou();
    setCaption("Hmm\u2026 is that a word? Try again!", "bad");
    form.classList.add("shake");
    heroState("wobble", 700);
    return sleep(1100).then(() => {
      form.classList.remove("shake");
      heroState(null);
      busy = false;
      if (!auto && !over) setInteractive(true);
      if (!auto) wordInput.focus({ preventScroll: true });
    });
  }

  function reactAlmost(mean) {
    setCaption(`\u201CDid you mean \u2018${mean}\u2019?\u201D Tap the chip to use it!`, "");
    showDidyou(mean);
    form.classList.add("shake");
    setTimeout(() => form.classList.remove("shake"), 500);
    return Promise.resolve();
  }

  function submit(raw) {
    if (busy || over || !started) return Promise.resolve();
    const c = classify(raw);
    switch (c.type) {
      case "empty": setCaption("Type a word first!", ""); return Promise.resolve();
      case "silly": return reactFail(c.word, c.entry);
      case "good": return reactGood(c.word, c.entry);
      case "almost": return reactAlmost(c.mean);
      case "nonword": return reactWobble();
    }
    return Promise.resolve();
  }

  /* ============================ FLOW ============================ */

  function setArea(i) {
    const b = BEATS[i];
    stage.className = "stage area-" + b.area;
    doodleSet(skyEl, SKIES[b.sky]);
    genCat();
    clearProps(true);
    setDizzy(false);
    heroState(null);
    /* hero back to stage left without a transition */
    heroRig.style.transition = "none";
    heroRig.style.transitionDuration = "";
    moveHero(12, 13);
    void heroRig.offsetWidth;
    heroRig.style.transition = "";
  }

  function tagSky() {
    let s = "";
    try { if (skyEl && skyEl.seed != null) s = String(skyEl.seed); } catch (e) { s = ""; }
    const b = BEATS[Math.min(idx, BEATS.length - 1)];
    skyTag.textContent = `${b.areaName} · sky ${s ? "#" + s.slice(-5) : "no. " + skyRolls}`;
  }

  function advance() {
    idx += 1;
    if (idx >= BEATS.length) return finish();
    /* travel flash → new area + fresh sky (setArea rewrites className, so
       the flash class goes on after the area swap) */
    setArea(idx);
    stage.classList.add("fresh");
    setTimeout(() => stage.classList.remove("fresh"), 620);
    renderSentence();
    tagSky();
    if (!auto) setInteractive(true);
  }

  function finish() {
    over = true;
    renderDots();
    setInteractive(false);
    setCaption("The tale is written!", "good");
    recapList.innerHTML = "";
    BEATS.forEach((s, i) => {
      const li = document.createElement("li");
      li.innerHTML = `${s.title} ${s.pre} <b>${chosen[i]}</b>${s.post}`;
      recapList.appendChild(li);
    });
    const sillies = oops.flat().filter(Boolean);
    if (sillies.length) {
      sillyRecap.hidden = false;
      sillyRecap.textContent = `Bonus silliness along the way: ${[...new Set(sillies)].join(", ")}.`;
    } else {
      sillyRecap.hidden = true;
    }
    endingCard.hidden = false;
  }

  function restart(toMaker) {
    idx = 0;
    over = false;
    busy = false;
    started = !toMaker;
    chosen.fill(null);
    oops.forEach((a) => (a.length = 0));
    taleWords.innerHTML = '<span class="tale-empty">No words yet — the page is blank.</span>';
    endingCard.hidden = true;
    hideDidyou();
    setArea(0);
    setDizzy(false);
    heroState(null);
    makerPanel.hidden = !toMaker;
    sentencePanel.hidden = !!toMaker;
    if (toMaker) {
      setCaption("First, build your sticker hero!", "");
      setInteractive(false);
      renderDots();
    } else {
      renderSentence();
      setInteractive(true);
    }
    tagSky();
  }

  function startStory() {
    if (started) return;
    started = true;
    makerPanel.hidden = true;
    sentencePanel.hidden = false;
    setArea(0);
    renderSentence();
    if (!auto) setInteractive(true);
    setCaption("Give Pip a word!", "");
  }

  function newSky() {
    skyRolls += 1;
    doodleUpdate(skyEl);
    doodleUpdate(sunEl);
    genCat();
    stage.classList.add("fresh");
    setTimeout(() => stage.classList.remove("fresh"), 620);
    tagSky();
  }

  /* ============================ AUTO-DEMO ============================ */

  async function waitIdle(runId) {
    while (busy && auto && runId === autoRun) await sleep(90);
  }

  async function typeWord(word, runId) {
    wordInput.value = "";
    for (let i = 1; i <= word.length; i++) {
      if (!auto || runId !== autoRun) return false;
      wordInput.value = word.slice(0, i);
      autosizeInput();
      await sleep(85);
    }
    return true;
  }

  async function autoBuildHero(runId) {
    /* hands-free sticker build: tap one swatch per row */
    const groups = ["body", "eyes", "hat", "color"];
    for (const g of groups) {
      if (!auto || runId !== autoRun) return;
      const row = document.querySelector(`.opt-row[data-group="${g}"]`);
      const btns = [...row.querySelectorAll(".swatch")];
      const b = pick(btns);
      setHeroOpt(g, b.dataset.opt, b);
      setCaption(`Auto-picker chooses ${g}…`, "");
      await sleep(620);
    }
    setCaption("A hero is born! Off we go.", "good");
    await sleep(700);
    startStory();
  }

  async function runAuto() {
    const runId = ++autoRun;
    auto = true;
    busy = false;
    watchLabel.textContent = "Stop the show";
    setInteractive(false);
    if (over) restart(false);
    if (!started) {
      await autoBuildHero(runId);
      if (!auto || runId !== autoRun) return cleanupAuto(runId);
    }
    while (idx < BEATS.length && auto && runId === autoRun && !over) {
      const attempts = BEATS[idx].auto;
      for (const word of attempts) {
        if (!auto || runId !== autoRun || over) break;
        await sleep(650);
        const typed = await typeWord(word, runId);
        if (!typed) break;
        await sleep(420);
        const before = idx;
        submit(word);
        await waitIdle(runId);
        await sleep(700);
        if (idx > before) break;
      }
    }
    cleanupAuto(runId);
  }

  function cleanupAuto(runId) {
    /* a stale run (stopped then re-started) must not clobber the new run */
    if (runId != null && runId !== autoRun) return;
    auto = false;
    watchLabel.textContent = "Watch it play";
    if (!over && started) setInteractive(true);
  }

  function stopAuto() {
    auto = false;
    autoRun += 1;
    busy = false;
    setDizzy(false);
    heroState(null);
    watchLabel.textContent = "Watch it play";
    if (!over && started) {
      setInteractive(true);
      setCaption("Show stopped. Your turn!", "");
      renderSentence();
    } else if (!started) {
      setCaption("First, build your sticker hero!", "");
    }
  }

  /* ============================ WIRING ============================ */

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    submit(wordInput.value);
  });

  wordInput.addEventListener("input", () => { autosizeInput(); hideDidyou(); });

  newSkyBtn.addEventListener("click", newSky);
  surpriseBtn.addEventListener("click", () => { if (!auto) surpriseMe(true); });
  startBtn.addEventListener("click", () => { if (!auto) startStory(); });

  playAgainBtn.addEventListener("click", () => restart(false));
  newHeroBtn.addEventListener("click", () => restart(true));

  watchBtn.addEventListener("click", () => {
    if (auto) stopAuto();
    else runAuto();
  });

  /* ============================ BOOT ============================ */

  renderHero();
  syncSwatches();
  renderDots();
  setArea(0);
  tagSky();
  setInteractive(false);
  setTimeout(tagSky, 900); // seed is available once the element upgrades
})();
