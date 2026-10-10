/* ============================================================
   Fill the Tale — Monster Maker edition
   props.js — chunky paper-sticker SVG props + pal accessories.
   Every prop is a plain <svg> string; game.js drops them into
   the diorama. Palette follows CONVENTIONS.md.
   ============================================================ */

const INK = '#2B2118';
const S = (vb, inner) =>
  `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${inner}</svg>`;

/* ---------------- journey props (sensible words) ---------------- */

export const PROPS = {

  /* --- beat 1 · blocked path --- */
  bridge: S('0 0 170 90', `
    <path d="M8 74 Q85 8 162 74 L162 86 L8 86 Z" fill="#C98A54" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M8 74 Q85 8 162 74" fill="none" stroke="${INK}" stroke-width="5"/>
    <line x1="36" y1="51" x2="36" y2="86" stroke="${INK}" stroke-width="4"/>
    <line x1="64" y1="37" x2="64" y2="86" stroke="${INK}" stroke-width="4"/>
    <line x1="92" y1="34" x2="92" y2="86" stroke="${INK}" stroke-width="4"/>
    <line x1="120" y1="42" x2="120" y2="86" stroke="${INK}" stroke-width="4"/>
    <line x1="145" y1="62" x2="145" y2="86" stroke="${INK}" stroke-width="4"/>`),

  log: S('0 0 140 70', `
    <rect x="8" y="18" width="110" height="38" rx="19" fill="#A9713F" stroke="${INK}" stroke-width="5"/>
    <circle cx="118" cy="37" r="20" fill="#D9A569" stroke="${INK}" stroke-width="5"/>
    <circle cx="118" cy="37" r="11" fill="none" stroke="${INK}" stroke-width="3"/>
    <circle cx="118" cy="37" r="4" fill="${INK}"/>
    <path d="M24 30 h70 M24 44 h60" stroke="#7d4f27" stroke-width="4" stroke-linecap="round"/>`),

  plank: S('0 0 140 60', `
    <rect x="6" y="18" width="128" height="26" rx="8" transform="rotate(-4 70 30)" fill="#C98A54" stroke="${INK}" stroke-width="5"/>
    <path d="M26 30 l92 -8 M30 38 l90 -7" stroke="#8a5a30" stroke-width="3" stroke-linecap="round"/>`),

  vine: S('0 0 60 150', `
    <path d="M30 2 C 12 40, 48 70, 30 110 C 22 128, 34 140, 30 148" fill="none" stroke="#3E8E5A" stroke-width="8" stroke-linecap="round"/>
    <ellipse cx="16" cy="46" rx="12" ry="7" transform="rotate(-30 16 46)" fill="#4FB06D" stroke="${INK}" stroke-width="3"/>
    <ellipse cx="46" cy="78" rx="12" ry="7" transform="rotate(28 46 78)" fill="#4FB06D" stroke="${INK}" stroke-width="3"/>
    <ellipse cx="18" cy="110" rx="11" ry="6" transform="rotate(-24 18 110)" fill="#4FB06D" stroke="${INK}" stroke-width="3"/>`),

  ladder: S('0 0 80 150', `
    <line x1="20" y1="6" x2="14" y2="146" stroke="#A9713F" stroke-width="9" stroke-linecap="round"/>
    <line x1="60" y1="6" x2="54" y2="146" stroke="#A9713F" stroke-width="9" stroke-linecap="round"/>
    <line x1="18" y1="34" x2="59" y2="34" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>
    <line x1="17" y1="62" x2="58" y2="62" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>
    <line x1="16" y1="90" x2="57" y2="90" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>
    <line x1="15" y1="118" x2="56" y2="118" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>`),

  stones: S('0 0 170 60', `
    <ellipse cx="26" cy="40" rx="24" ry="14" fill="#B8B2A6" stroke="${INK}" stroke-width="5"/>
    <ellipse cx="86" cy="30" rx="26" ry="15" fill="#CDC7BA" stroke="${INK}" stroke-width="5"/>
    <ellipse cx="146" cy="42" rx="22" ry="13" fill="#B8B2A6" stroke="${INK}" stroke-width="5"/>`),

  tunnel: S('0 0 120 100', `
    <path d="M14 94 V58 C14 24 106 24 106 58 V94 Z" fill="#8d7b68" stroke="${INK}" stroke-width="5"/>
    <path d="M30 94 V60 C30 40 90 40 90 60 V94 Z" fill="#3a2f26" stroke="${INK}" stroke-width="5"/>
    <path d="M24 46 h18 M50 34 h22 M82 46 h14 M24 70 h10 M86 70 h12" stroke="#6d5c49" stroke-width="4" stroke-linecap="round"/>`),

  trampoline: S('0 0 130 80', `
    <line x1="26" y1="44" x2="14" y2="74" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>
    <line x1="104" y1="44" x2="116" y2="74" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>
    <ellipse cx="65" cy="38" rx="55" ry="16" fill="#5DA9E9" stroke="${INK}" stroke-width="5"/>
    <ellipse cx="65" cy="36" rx="40" ry="10" fill="#2B2118"/>`),

  /* --- beat 1 + shared slip/stick gags --- */
  bananaPeel: S('0 0 110 80', `
    <path d="M55 30 C 30 34, 16 52, 12 70 C 30 62, 40 58, 55 58 C 70 58, 80 62, 98 70 C 94 52, 80 34, 55 30 Z" fill="#FFC53D" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M55 30 C 52 18, 58 10, 66 8 C 60 18, 60 24, 62 30" fill="#FFE08A" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
    <circle cx="55" cy="52" r="6" fill="#E8A93D"/>`),

  soap: S('0 0 110 80', `
    <rect x="18" y="34" width="74" height="36" rx="16" fill="#BFE8FF" stroke="${INK}" stroke-width="5"/>
    <text x="55" y="58" text-anchor="middle" font-family="Fredoka,sans-serif" font-weight="700" font-size="15" fill="#2f7fb8">SOAP</text>
    <circle cx="88" cy="22" r="9" fill="#fff" stroke="${INK}" stroke-width="3"/>
    <circle cx="100" cy="34" r="6" fill="#fff" stroke="${INK}" stroke-width="3"/>`),

  iceCube: S('0 0 90 90', `
    <rect x="14" y="16" width="62" height="60" rx="12" transform="rotate(-6 45 46)" fill="#BFE8FF" stroke="${INK}" stroke-width="5"/>
    <path d="M30 34 l18 -6 M34 52 l26 -8" stroke="#fff" stroke-width="6" stroke-linecap="round"/>
    <path d="M22 76 q8 8 16 0 M58 78 q8 8 16 0" stroke="#8fd0f5" stroke-width="5" fill="none" stroke-linecap="round"/>`),

  slimeBlob: S('0 0 120 80', `
    <path d="M14 60 C 8 36, 34 30, 44 40 C 50 22, 84 22, 88 40 C 104 34, 114 50, 106 62 C 100 72, 22 72, 14 60 Z" fill="#7CC78F" stroke="${INK}" stroke-width="5"/>
    <circle cx="46" cy="50" r="5" fill="#3E8E5A"/><circle cx="78" cy="46" r="6" fill="#3E8E5A"/><circle cx="62" cy="58" r="4" fill="#3E8E5A"/>`),

  gluePuddle: S('0 0 120 70', `
    <path d="M12 52 C 20 34, 48 40, 60 36 C 80 30, 110 40, 108 52 C 106 64, 20 66, 12 52 Z" fill="#F5E9D0" stroke="${INK}" stroke-width="5"/>
    <circle cx="40" cy="48" r="5" fill="#fff"/><circle cx="76" cy="46" r="6" fill="#fff"/>`),

  /* --- beat 2 · rain gear --- */
  umbrella: S('0 0 130 120', `
    <path d="M8 62 C 8 20, 122 20, 122 62 C 108 52, 98 52, 93 62 C 82 52, 74 52, 65 62 C 56 52, 48 52, 37 62 C 32 52, 22 52, 8 62 Z" fill="#FF6B57" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
    <line x1="65" y1="30" x2="65" y2="100" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>
    <path d="M65 100 q0 12 -12 12 q-10 0 -10 -10" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>
    <circle cx="65" cy="20" r="6" fill="#FFC53D" stroke="${INK}" stroke-width="4"/>`),

  raincoat: S('0 0 100 120', `
    <path d="M50 12 C 34 12, 26 26, 24 40 L14 96 q-2 10 8 10 h56 q10 0 8 -10 L76 40 C 74 26, 66 12, 50 12 Z" fill="#FFC53D" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M50 12 C 40 12, 36 22, 36 30 h28 C 64 22, 60 12, 50 12 Z" fill="#FF9C86" stroke="${INK}" stroke-width="4"/>
    <line x1="50" y1="42" x2="50" y2="100" stroke="${INK}" stroke-width="4"/>
    <circle cx="50" cy="56" r="4" fill="${INK}"/><circle cx="50" cy="74" r="4" fill="${INK}"/><circle cx="50" cy="92" r="4" fill="${INK}"/>`),

  hat: S('0 0 120 70', `
    <path d="M30 44 C 30 14, 90 14, 90 44 Z" fill="#5DA9E9" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
    <ellipse cx="60" cy="46" rx="52" ry="14" fill="#5DA9E9" stroke="${INK}" stroke-width="5"/>
    <rect x="42" y="34" width="36" height="10" rx="4" fill="#FFC53D" stroke="${INK}" stroke-width="3"/>`),

  leaf: S('0 0 120 110', `
    <path d="M60 8 C 100 26, 108 70, 60 100 C 12 70, 20 26, 60 8 Z" fill="#4FB06D" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M60 16 V96 M60 40 L40 56 M60 40 L82 54 M60 66 L38 80 M60 66 L84 78" stroke="#2E7D4F" stroke-width="4" stroke-linecap="round"/>`),

  newspaper: S('0 0 120 90', `
    <rect x="10" y="18" width="100" height="60" rx="6" transform="rotate(-3 60 48)" fill="#FFFDF6" stroke="${INK}" stroke-width="5"/>
    <rect x="22" y="28" width="34" height="18" fill="#5DA9E9" stroke="${INK}" stroke-width="3"/>
    <path d="M64 30 h34 M64 38 h34 M22 56 h76 M22 64 h76 M22 72 h52" stroke="#9b8b72" stroke-width="4" stroke-linecap="round"/>`),

  mushroom: S('0 0 110 100', `
    <path d="M14 52 C 14 14, 96 14, 96 52 C 96 60, 14 60, 14 52 Z" fill="#FF6B57" stroke="${INK}" stroke-width="5"/>
    <rect x="38" y="56" width="34" height="34" rx="12" fill="#FFF3DC" stroke="${INK}" stroke-width="5"/>
    <circle cx="38" cy="36" r="8" fill="#FFFDF6"/><circle cx="66" cy="28" r="6" fill="#FFFDF6"/><circle cx="82" cy="42" r="7" fill="#FFFDF6"/>`),

  bucket: S('0 0 100 100', `
    <path d="M22 30 h56 l-8 58 a8 8 0 0 1 -8 8 H38 a8 8 0 0 1 -8 -8 Z" fill="#FF6B57" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M24 32 C 24 10, 76 10, 76 32" fill="none" stroke="${INK}" stroke-width="5"/>
    <ellipse cx="50" cy="30" rx="28" ry="8" fill="#FF9C86" stroke="${INK}" stroke-width="4"/>`),

  paperBag: S('0 0 100 110', `
    <path d="M26 30 L20 96 q-2 10 8 10 h44 q10 0 8 -10 L74 30 Z" fill="#D9B078" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M26 30 l8 -12 10 10 8 -12 10 12 8 -10 4 12" fill="#C49A5E" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M36 52 q14 8 28 0 M38 68 q12 6 24 0" stroke="#a87f47" stroke-width="4" fill="none" stroke-linecap="round"/>`),

  toast: S('0 0 90 90', `
    <path d="M20 34 C 14 16, 76 16, 70 34 L74 78 a8 8 0 0 1 -8 8 H24 a8 8 0 0 1 -8 -8 Z" fill="#E8B06B" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M28 40 C 26 28, 64 28, 62 40 L64 76 H26 Z" fill="#F7D9A8"/>
    <circle cx="38" cy="52" r="3" fill="#c98a54"/><circle cx="52" cy="60" r="3" fill="#c98a54"/><circle cx="46" cy="46" r="3" fill="#c98a54"/>`),

  soggyBox: S('0 0 110 80', `
    <path d="M14 34 L34 20 h44 l18 14 v30 q0 12 -12 12 H26 q-12 0 -12 -12 Z" fill="#D9B078" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M14 34 h82 M56 20 v14" stroke="${INK}" stroke-width="4"/>
    <path d="M30 74 q-4 8 -12 6 M80 74 q4 8 12 6" stroke="#8fd0f5" stroke-width="5" fill="none" stroke-linecap="round"/>`),

  sponge: S('0 0 110 80', `
    <rect x="14" y="24" width="82" height="42" rx="12" fill="#FFC53D" stroke="${INK}" stroke-width="5"/>
    <circle cx="34" cy="38" r="5" fill="#D9A024"/><circle cx="56" cy="48" r="6" fill="#D9A024"/><circle cx="76" cy="36" r="5" fill="#D9A024"/><circle cx="44" cy="56" r="4" fill="#D9A024"/>
    <path d="M30 66 q0 10 -8 10 M84 66 q0 10 8 10" stroke="#5DA9E9" stroke-width="5" fill="none" stroke-linecap="round"/>`),

  /* --- beat 3 · river craft --- */
  boat: S('0 0 150 110', `
    <line x1="75" y1="8" x2="75" y2="58" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>
    <path d="M75 10 L116 54 H75 Z" fill="#FFFDF6" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M75 18 L42 54 H75 Z" fill="#FFC53D" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M18 58 h114 l-16 34 a12 12 0 0 1 -11 8 H45 a12 12 0 0 1 -11 -8 Z" fill="#FF6B57" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`),

  raft: S('0 0 140 70', `
    <rect x="10" y="14" width="120" height="16" rx="8" fill="#C98A54" stroke="${INK}" stroke-width="4"/>
    <rect x="10" y="30" width="120" height="16" rx="8" fill="#B87B42" stroke="${INK}" stroke-width="4"/>
    <rect x="10" y="46" width="120" height="16" rx="8" fill="#C98A54" stroke="${INK}" stroke-width="4"/>
    <line x1="42" y1="10" x2="42" y2="66" stroke="${INK}" stroke-width="5"/>
    <line x1="98" y1="10" x2="98" y2="66" stroke="${INK}" stroke-width="5"/>`),

  canoe: S('0 0 150 60', `
    <path d="M8 24 C 30 46, 120 46, 142 24 C 120 34, 30 34, 8 24 Z" fill="#B565D8" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
    <line x1="40" y1="8" x2="60" y2="50" stroke="#A9713F" stroke-width="6" stroke-linecap="round"/>
    <ellipse cx="38" cy="8" rx="12" ry="7" transform="rotate(-40 38 8)" fill="#A9713F" stroke="${INK}" stroke-width="4"/>`),

  surfboard: S('0 0 150 50', `
    <path d="M8 26 C 8 12, 142 12, 142 26 C 142 40, 8 40, 8 26 Z" fill="#FF6B57" stroke="${INK}" stroke-width="5"/>
    <path d="M30 15 v22 M115 15 v22" stroke="#FFFDF6" stroke-width="6"/>
    <path d="M52 14 v24" stroke="#FFC53D" stroke-width="6"/>`),

  lilypad: S('0 0 110 80', `
    <path d="M10 44 A45 32 0 1 0 92 24 L58 42 Z" fill="#4FB06D" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
    <circle cx="82" cy="30" r="11" fill="#FF9C86" stroke="${INK}" stroke-width="4"/>
    <circle cx="82" cy="30" r="4" fill="#FFC53D"/>`),

  /* --- beat 3 · sinkers (splash gag) --- */
  toaster: S('0 0 100 100', `
    <rect x="16" y="34" width="68" height="50" rx="12" fill="#C9CFD6" stroke="${INK}" stroke-width="5"/>
    <rect x="30" y="26" width="16" height="10" rx="4" fill="${INK}"/>
    <rect x="54" y="26" width="16" height="10" rx="4" fill="${INK}"/>
    <path d="M34 20 C 30 8, 44 8, 42 20 M58 20 C 56 10, 70 10, 66 20" fill="#E8B06B" stroke="${INK}" stroke-width="4"/>
    <circle cx="80" cy="46" r="5" fill="#FF6B57" stroke="${INK}" stroke-width="3"/>
    <line x1="88" y1="60" x2="96" y2="60" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>`),

  fridge: S('0 0 80 130', `
    <rect x="12" y="8" width="56" height="114" rx="10" fill="#BFE8FF" stroke="${INK}" stroke-width="5"/>
    <line x1="12" y1="46" x2="68" y2="46" stroke="${INK}" stroke-width="5"/>
    <line x1="58" y1="18" x2="58" y2="36" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>
    <line x1="58" y1="58" x2="58" y2="82" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>
    <circle cx="30" cy="30" r="6" fill="#FF6B57" stroke="${INK}" stroke-width="3"/>`),

  rock: S('0 0 110 80', `
    <path d="M12 62 C 6 34, 34 16, 58 20 C 88 14, 106 40, 100 62 C 80 72, 30 72, 12 62 Z" fill="#B8B2A6" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M36 40 l14 -10 M66 34 l16 8 M44 56 h24" stroke="#8f897c" stroke-width="4" stroke-linecap="round"/>`),

  anchor: S('0 0 90 110', `
    <circle cx="45" cy="16" r="9" fill="none" stroke="${INK}" stroke-width="6"/>
    <line x1="45" y1="25" x2="45" y2="92" stroke="#5a6b7d" stroke-width="10" stroke-linecap="round"/>
    <line x1="22" y1="42" x2="68" y2="42" stroke="#5a6b7d" stroke-width="9" stroke-linecap="round"/>
    <path d="M16 66 C 16 94, 74 94, 74 66" fill="none" stroke="#5a6b7d" stroke-width="9" stroke-linecap="round"/>
    <path d="M16 66 l-8 6 M16 66 l8 8 M74 66 l-8 8 M74 66 l8 6" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>`),

  piano: S('0 0 120 100', `
    <rect x="10" y="16" width="100" height="70" rx="10" fill="#3a3130" stroke="${INK}" stroke-width="5"/>
    <rect x="20" y="52" width="80" height="22" rx="4" fill="#FFFDF6" stroke="${INK}" stroke-width="4"/>
    <path d="M32 52 v12 M44 52 v12 M60 52 v12 M72 52 v12 M84 52 v12" stroke="${INK}" stroke-width="5"/>
    <circle cx="36" cy="34" r="5" fill="#FFC53D"/><circle cx="84" cy="34" r="5" fill="#FFC53D"/>`),

  anvil: S('0 0 120 80', `
    <path d="M8 20 h60 l14 -10 v20 h26 c0 14 -14 18 -26 18 l-8 22 a6 6 0 0 1 -6 4 H44 a6 6 0 0 1 -6 -4 l-8 -22 C 16 46, 8 36, 8 20 Z" fill="#6f7b8a" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
    <rect x="30" y="66" width="56" height="10" rx="4" fill="#525f6e" stroke="${INK}" stroke-width="4"/>`),

  brick: S('0 0 110 70', `
    <rect x="10" y="10" width="42" height="22" rx="4" fill="#E0664F" stroke="${INK}" stroke-width="4"/>
    <rect x="58" y="10" width="42" height="22" rx="4" fill="#C9553F" stroke="${INK}" stroke-width="4"/>
    <rect x="32" y="38" width="42" height="22" rx="4" fill="#E0664F" stroke="${INK}" stroke-width="4"/>`),

  tv: S('0 0 100 100', `
    <line x1="34" y1="16" x2="50" y2="30" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
    <line x1="66" y1="16" x2="50" y2="30" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
    <circle cx="34" cy="14" r="5" fill="${INK}"/><circle cx="66" cy="14" r="5" fill="${INK}"/>
    <rect x="10" y="30" width="80" height="56" rx="10" fill="#A9713F" stroke="${INK}" stroke-width="5"/>
    <rect x="20" y="40" width="44" height="36" rx="6" fill="#BFE8FF" stroke="${INK}" stroke-width="4"/>
    <circle cx="76" cy="48" r="5" fill="${INK}"/><circle cx="76" cy="64" r="5" fill="${INK}"/>`),

  /* --- beat 4 · lights --- */
  lantern: S('0 0 90 120', `
    <path d="M32 22 C 32 8, 58 8, 58 22" fill="none" stroke="${INK}" stroke-width="6"/>
    <rect x="22" y="22" width="46" height="12" rx="5" fill="#5a6b7d" stroke="${INK}" stroke-width="4"/>
    <path d="M24 34 h42 l6 50 a10 10 0 0 1 -10 10 H28 a10 10 0 0 1 -10 -10 Z" fill="#FFD980" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
    <ellipse cx="45" cy="62" rx="12" ry="18" fill="#FFF3C4"/>
    <rect x="20" y="94" width="50" height="10" rx="4" fill="#5a6b7d" stroke="${INK}" stroke-width="4"/>`),

  torch: S('0 0 70 120', `
    <rect x="26" y="48" width="18" height="64" rx="8" fill="#A9713F" stroke="${INK}" stroke-width="5"/>
    <path d="M35 8 C 50 22, 52 36, 35 52 C 18 36, 20 22, 35 8 Z" fill="#FF6B57" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M35 24 C 43 32, 43 40, 35 46 C 27 40, 27 32, 35 24 Z" fill="#FFC53D"/>`),

  candle: S('0 0 70 110', `
    <rect x="22" y="44" width="26" height="58" rx="8" fill="#FFF3DC" stroke="${INK}" stroke-width="5"/>
    <path d="M48 52 q10 4 6 14" stroke="#E8D9B8" stroke-width="6" fill="none" stroke-linecap="round"/>
    <line x1="35" y1="44" x2="35" y2="34" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>
    <path d="M35 8 C 46 20, 46 30, 35 36 C 24 30, 24 20, 35 8 Z" fill="#FFC53D" stroke="${INK}" stroke-width="4"/>`),

  flashlight: S('0 0 120 70', `
    <rect x="14" y="24" width="64" height="26" rx="10" fill="#5DA9E9" stroke="${INK}" stroke-width="5"/>
    <path d="M78 20 h18 l8 8 v14 l-8 8 H78 Z" fill="#8fbde8" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M110 26 l8 -6 M112 36 l10 0 M110 46 l8 6" stroke="#FFC53D" stroke-width="5" stroke-linecap="round"/>`),

  lamp: S('0 0 90 120', `
    <path d="M30 14 h30 l12 30 H18 Z" fill="#FF9C86" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
    <line x1="45" y1="44" x2="45" y2="96" stroke="${INK}" stroke-width="6"/>
    <ellipse cx="45" cy="102" rx="26" ry="10" fill="#C98A54" stroke="${INK}" stroke-width="5"/>`),

  match: S('0 0 50 110', `
    <rect x="20" y="38" width="10" height="64" rx="5" fill="#E8C98F" stroke="${INK}" stroke-width="4"/>
    <path d="M25 6 C 36 18, 36 30, 25 38 C 14 30, 14 18, 25 6 Z" fill="#FF6B57" stroke="${INK}" stroke-width="4"/>
    <path d="M25 20 C 30 26, 30 32, 25 34 C 20 32, 20 26, 25 20 Z" fill="#FFC53D"/>`),

  glowstick: S('0 0 90 60', `
    <rect x="12" y="18" width="66" height="16" rx="8" transform="rotate(12 45 26)" fill="#7CF0B0" stroke="${INK}" stroke-width="5"/>
    <path d="M16 12 l-8 -8 M30 8 l-2 -10" stroke="#7CF0B0" stroke-width="4" stroke-linecap="round"/>`),

  bulbProp: S('0 0 80 110', `
    <circle cx="40" cy="40" r="28" fill="#FFF3C4" stroke="${INK}" stroke-width="5"/>
    <path d="M30 62 h20 l-4 14 h-12 Z" fill="#C9CFD6" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
    <line x1="32" y1="82" x2="48" y2="82" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
    <line x1="34" y1="92" x2="46" y2="92" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
    <path d="M40 6 v8 M14 16 l6 6 M66 16 l-6 6" stroke="#FFC53D" stroke-width="5" stroke-linecap="round"/>`),

  starProp: S('0 0 90 90', `
    <path d="M45 8 l11 24 26 3 -19 18 5 26 -23 -13 -23 13 5 -26 -19 -18 26 -3 Z" fill="#FFC53D" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
    <circle cx="38" cy="40" r="3" fill="${INK}"/><circle cx="52" cy="40" r="3" fill="${INK}"/>
    <path d="M38 48 q7 6 14 0" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`),

  /* --- beat 4 · fizzle gags --- */
  wetNoodle: S('0 0 100 80', `
    <path d="M12 30 C 30 44, 40 20, 55 34 C 66 44, 76 28, 90 40" fill="none" stroke="#F2D488" stroke-width="9" stroke-linecap="round"/>
    <path d="M18 50 C 34 62, 48 42, 62 56 C 72 64, 82 52, 90 58" fill="none" stroke="#E8B06B" stroke-width="9" stroke-linecap="round"/>
    <path d="M30 68 q6 8 14 2 M64 70 q6 8 14 2" stroke="#8fd0f5" stroke-width="5" fill="none" stroke-linecap="round"/>`),

  snowball: S('0 0 90 80', `
    <circle cx="45" cy="44" r="30" fill="#FFFDF6" stroke="${INK}" stroke-width="5"/>
    <path d="M28 34 l6 -6 M56 26 l8 -4 M60 50 l8 6" stroke="#BFE8FF" stroke-width="5" stroke-linecap="round"/>
    <path d="M26 70 q6 8 14 2 M56 72 q6 8 14 2" stroke="#8fd0f5" stroke-width="5" fill="none" stroke-linecap="round"/>`),

  /* --- beat 5 · home payoffs --- */
  doorOpen: S('0 0 100 120', `
    <path d="M14 116 V44 C14 18 86 18 86 44 V116 Z" fill="#FFC53D" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M26 116 V48 C26 30 74 30 74 48 V116 Z" fill="#8A4B2C" stroke="${INK}" stroke-width="5"/>
    <circle cx="64" cy="82" r="5" fill="#FFC53D" stroke="${INK}" stroke-width="3"/>`),

  key: S('0 0 110 60', `
    <circle cx="26" cy="30" r="16" fill="none" stroke="#E8A93D" stroke-width="10"/>
    <rect x="40" y="25" width="60" height="10" rx="5" fill="#FFC53D" stroke="${INK}" stroke-width="4"/>
    <rect x="80" y="34" width="8" height="12" fill="#FFC53D" stroke="${INK}" stroke-width="4"/>
    <rect x="92" y="34" width="8" height="16" fill="#FFC53D" stroke="${INK}" stroke-width="4"/>`),

  cookieJar: S('0 0 100 120', `
    <rect x="24" y="34" width="52" height="70" rx="14" fill="#BFE8FF" stroke="${INK}" stroke-width="5" opacity=".92"/>
    <ellipse cx="50" cy="30" rx="30" ry="12" fill="#FF6B57" stroke="${INK}" stroke-width="5"/>
    <circle cx="50" cy="22" r="7" fill="#FFC53D" stroke="${INK}" stroke-width="4"/>
    <circle cx="40" cy="72" r="9" fill="#C98A54" stroke="${INK}" stroke-width="3"/>
    <circle cx="60" cy="84" r="9" fill="#C98A54" stroke="${INK}" stroke-width="3"/>
    <circle cx="58" cy="58" r="8" fill="#C98A54" stroke="${INK}" stroke-width="3"/>`),

  cookie: S('0 0 60 60', `
    <circle cx="30" cy="30" r="24" fill="#D9A569" stroke="${INK}" stroke-width="5"/>
    <circle cx="22" cy="24" r="4" fill="#5b3a1e"/><circle cx="38" cy="30" r="4" fill="#5b3a1e"/><circle cx="28" cy="40" r="4" fill="#5b3a1e"/><circle cx="42" cy="42" r="3" fill="#5b3a1e"/>`),

  gate: S('0 0 120 100', `
    <rect x="8" y="18" width="14" height="76" rx="4" fill="#FFFDF6" stroke="${INK}" stroke-width="4"/>
    <rect x="98" y="18" width="14" height="76" rx="4" fill="#FFFDF6" stroke="${INK}" stroke-width="4"/>
    <rect x="26" y="26" width="10" height="62" rx="4" fill="#FFFDF6" stroke="${INK}" stroke-width="4"/>
    <rect x="46" y="26" width="10" height="62" rx="4" fill="#FFFDF6" stroke="${INK}" stroke-width="4"/>
    <rect x="66" y="26" width="10" height="62" rx="4" fill="#FFFDF6" stroke="${INK}" stroke-width="4"/>
    <rect x="86" y="26" width="10" height="62" rx="4" fill="#FFFDF6" stroke="${INK}" stroke-width="4"/>
    <rect x="8" y="38" width="104" height="10" fill="#FFFDF6" stroke="${INK}" stroke-width="4"/>
    <rect x="8" y="66" width="104" height="10" fill="#FFFDF6" stroke="${INK}" stroke-width="4"/>`),

  mailbox: S('0 0 100 120', `
    <line x1="50" y1="66" x2="50" y2="112" stroke="#A9713F" stroke-width="9" stroke-linecap="round"/>
    <path d="M20 66 V44 C20 22 80 22 80 44 V66 Z" fill="#5DA9E9" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
    <rect x="20" y="60" width="60" height="8" fill="#3f7fb8"/>
    <line x1="66" y1="26" x2="66" y2="44" stroke="${INK}" stroke-width="5"/>
    <rect x="60" y="16" width="16" height="12" rx="3" fill="#FF6B57" stroke="${INK}" stroke-width="4"/>`),

  chest: S('0 0 110 100', `
    <path d="M14 46 C 14 18, 96 18, 96 46 V52 H14 Z" fill="#A9713F" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
    <rect x="14" y="52" width="82" height="38" rx="6" fill="#C98A54" stroke="${INK}" stroke-width="5"/>
    <rect x="48" y="44" width="14" height="20" rx="4" fill="#FFC53D" stroke="${INK}" stroke-width="4"/>
    <path d="M22 56 l8 -6 M34 58 l8 -8 M76 56 l8 -6" stroke="#FFC53D" stroke-width="5" stroke-linecap="round"/>`),

  gift: S('0 0 100 110', `
    <rect x="18" y="44" width="64" height="56" rx="8" fill="#B565D8" stroke="${INK}" stroke-width="5"/>
    <rect x="12" y="30" width="76" height="18" rx="6" fill="#C77FE3" stroke="${INK}" stroke-width="5"/>
    <line x1="50" y1="30" x2="50" y2="100" stroke="#FFC53D" stroke-width="9"/>
    <path d="M50 30 C 36 30, 32 14, 44 14 C 54 14, 50 30, 50 30 C 50 30, 46 14, 56 14 C 68 14, 64 30, 50 30 Z" fill="#FFC53D" stroke="${INK}" stroke-width="4"/>`),

  pickleJar: S('0 0 100 120', `
    <rect x="22" y="36" width="56" height="70" rx="12" fill="#CDEEC9" stroke="${INK}" stroke-width="5" opacity=".95"/>
    <rect x="20" y="22" width="60" height="16" rx="6" fill="#FF6B57" stroke="${INK}" stroke-width="5"/>
    <ellipse cx="38" cy="72" rx="9" ry="22" fill="#4FB06D" stroke="${INK}" stroke-width="3"/>
    <ellipse cx="60" cy="76" rx="9" ry="20" fill="#3E8E5A" stroke="${INK}" stroke-width="3"/>`),

  gluePot: S('0 0 100 110', `
    <path d="M30 40 h40 v56 a10 10 0 0 1 -10 10 H40 a10 10 0 0 1 -10 -10 Z" fill="#FFFDF6" stroke="${INK}" stroke-width="5"/>
    <path d="M40 40 V22 l10 -12 10 12 v18" fill="#FF6B57" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
    <rect x="38" y="58" width="24" height="28" rx="4" fill="#5DA9E9" stroke="${INK}" stroke-width="3"/>
    <path d="M50 8 q0 -8 8 -8" stroke="#F5E9D0" stroke-width="6" fill="none" stroke-linecap="round"/>`),

  /* --- global gags --- */
  stinkCloud: S('0 0 120 80', `
    <path d="M18 56 C 6 40, 24 24, 40 32 C 44 16, 76 16, 80 32 C 96 24, 114 40, 102 56 C 88 70, 32 70, 18 56 Z" fill="#B7D96A" stroke="${INK}" stroke-width="5"/>
    <path d="M36 44 q8 -10 16 0 M60 40 q8 -10 16 0" stroke="#7a9c3a" stroke-width="4" fill="none" stroke-linecap="round"/>`),

  ghostProp: S('0 0 90 110', `
    <path d="M45 10 C 22 10, 16 34, 16 56 V96 l10 -10 10 10 9 -10 9 10 10 -10 10 10 V56 C 74 34, 68 10, 45 10 Z" fill="#FFFDF6" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
    <circle cx="34" cy="46" r="5" fill="${INK}"/><circle cx="56" cy="46" r="5" fill="${INK}"/>
    <ellipse cx="45" cy="62" rx="6" ry="9" fill="${INK}"/>`),

  puddle: S('0 0 130 50', `
    <ellipse cx="65" cy="28" rx="58" ry="16" fill="#8fd0f5" stroke="${INK}" stroke-width="5"/>
    <ellipse cx="42" cy="26" rx="16" ry="5" fill="#BFE8FF"/>`),
};

/* ---------------- pal accessories ----------------
   Little add-ons layered on top of a generated DiceBear
   pal so "duck" reads ducky, "unicorn" reads horned…    */

export const PAL_ACC = {
  horn: S('0 0 40 60', `
    <path d="M20 4 L32 54 H8 Z" fill="#FFC53D" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M13 38 h14 M15 26 h10 M17 15 h6" stroke="#FF9C86" stroke-width="3" stroke-linecap="round"/>`),

  beak: S('0 0 60 40', `
    <path d="M8 12 C 22 2, 38 2, 52 12 C 46 30, 14 30, 8 12 Z" fill="#FF9C2E" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M12 16 C 24 24, 36 24, 48 16" fill="none" stroke="#c96f0e" stroke-width="3"/>`),

  fin: S('0 0 50 44', `
    <path d="M6 40 C 6 12, 30 4, 44 8 C 36 18, 34 28, 40 40 Z" fill="#5DA9E9" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`),

  shell: S('0 0 90 70', `
    <path d="M8 62 A38 38 0 0 1 82 62 Z" fill="#3E8E5A" stroke="${INK}" stroke-width="5"/>
    <path d="M45 26 v36 M22 44 l16 10 M68 44 l-16 10" stroke="#2E7D4F" stroke-width="4" stroke-linecap="round"/>`),

  floatRing: S('0 0 120 50', `
    <ellipse cx="60" cy="26" rx="52" ry="18" fill="#FF9C86" stroke="${INK}" stroke-width="5"/>
    <ellipse cx="60" cy="26" rx="26" ry="8" fill="#FFF8EC" stroke="${INK}" stroke-width="4"/>`),

  glow: S('0 0 30 30', `
    <circle cx="15" cy="15" r="9" fill="#FFE08A" stroke="${INK}" stroke-width="3"/>
    <circle cx="15" cy="15" r="3.5" fill="#fff"/>`),

  question: S('0 0 60 60', `
    <circle cx="30" cy="30" r="26" fill="#fff" stroke="${INK}" stroke-width="4"/>
    <text x="30" y="42" text-anchor="middle" font-family="Fredoka,sans-serif" font-weight="700" font-size="34" fill="${INK}">?</text>`),
};
