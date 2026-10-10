/* props.js — every spawned thing is a Konva.Group of sketchy strokes.
 *
 * PROPS.build(kind, seed) -> Konva.Group with feet at local (0,0).
 * Known kinds get a bespoke doodle; ANY unknown kind gets a wobbly blob
 * with its word scribbled under it — the LLM can invent anything.
 *
 * Groups are tagged:  node.setAttr('prop', true), node.name(displayName)
 * so hover shows the name chip and gags can find them.
 */
(function () {
  const S = SK;
  const INK = S.INK;

  /* ---------- kind normalization ---------- */
  const SYN = [
    [/\b(banana|peel|banana peel)\b/, 'banana peel'],
    [/\b(unicorn)\b/, 'unicorn'],
    [/\b(horse|pony|donkey|mule)\b/, 'horse'],
    [/\b(duck|goose|swan)\b/, 'duck'],
    [/\b(dragon|dinosaur|dino)\b/, 'dragon'],
    [/\b(boat|raft|canoe|kayak|ship|sailboat)\b/, 'boat'],
    [/\b(fish|whale|shark|dolphin|turtle|frog)\b/, 'fish'],
    [/\b(bike|bicycle|scooter|wagon|sled|sleigh|skateboard|car|bus)\b/, 'bike'],
    [/\b(bridge|plank)\b/, 'bridge'],
    [/\blogs?\b/, 'log'],
    [/\b(ladder|stairs|steps)\b/, 'ladder'],
    [/\b(vine|rope|swing)\b/, 'vine'],
    [/\b(umbrella|parasol|raincoat)\b/, 'umbrella'],
    [/\b(lantern|torch|candle|flashlight|lamp|firefl\w*|light)\b/, 'lantern'],
    [/\b(tree|oak|pine|palm|bush)\b/, 'tree'],
    [/\b(flowers?|daisy|tulip|sunflower)\b/, 'flower'],
    [/\b(mushroom|toadstool)\b/, 'mushroom'],
    [/\b(rock|boulder|stone|pebble)\b/, 'rock'],
    [/\b(straw house|house of straw|straw hut)\b/, 'straw house'],
    [/\b(stick house|house of sticks?|wooden house|wood house)\b/, 'stick house'],
    [/\b(brick house|house of bricks?|brick home)\b/, 'brick house'],
    [/\b(house|cottage|hut|home|cabin|shed)\b/, 'house'],
    [/\b(straw|hay|haystack|grass)\b/, 'straw'],
    [/\b(sticks?|wood|twigs?|lumber|planks?)\b/, 'sticks'],
    [/\b(bricks?|brick|blocks?|stone wall)\b/, 'bricks'],
    [/\b(pigs?|piglets?|hog|swine)\b/, 'pig'],
    [/\b(wolf|wolves|dog|fox|coyote)\b/, 'wolf'],
    [/\b(door|gate|doorway)\b/, 'door'],
    [/\b(key|keys|doorknob)\b/, 'key'],
    [/\b(cookie jar|cookie|cookies|jar)\b/, 'cookie jar'],
    [/\b(cake|cupcake|pie|muffin|donut)\b/, 'cake'],
    [/\b(gift|present|treasure|chest|prize)\b/, 'treasure'],
    [/\b(toaster|oven|microwave|stove)\b/, 'toaster'],
    [/\b(fridge|refrigerator|freezer|icebox)\b/, 'fridge'],
    [/\b(anvil|piano|safe|piano)\b/, 'anvil'],
    [/\b(sock|shoe|boot|slipper|hat|cap|crown)\b/, 'sock'],
    [/\b(slime|jelly|jello|goo|mud|puddle|muck|splat)\b/, 'slime'],
    [/\b(homework|paper|book|papers?|homework)\b/, 'homework'],
    [/\b(star|stars|sparkle|gem|diamond|letter-gem)\b/, 'star'],
    [/\b(cloud|clouds|fog|mist)\b/, 'cloud'],
    [/\b(sun|sunshine|sunny)\b/, 'sun'],
    [/\b(moon|crescent)\b/, 'moon'],
    [/\b(rainbow)\b/, 'rainbow'],
    [/\b(ball|beachball|balloon|balloons|bubble|bubbles|kite)\b/, 'ball'],
    [/\b(bird|birdie|chick|owl)\b/, 'bird'],
    [/\b(cat|kitten|kitty)\b/, 'cat'],
    [/\b(rabbit|bunny|hare)\b/, 'bunny'],
    [/\b(bee|butterfly|bug|ladybug|snail)\b/, 'bee'],
    [/\b(rain|rainstorm|drizzle)\b/, 'rain cloud'],
    [/\b(snow|snowman|snowflake|ice)\b/, 'snow'],
    [/\b(fence|wall|gate|hedge)\b/, 'fence'],
    [/\b(sign|signpost|arrow)\b/, 'sign'],
    [/\b(teddy|bear|teddy bear)\b/, 'teddy'],
    [/\b(robot|bot)\b/, 'robot'],
    [/\b(ghost|monster)\b/, 'ghost'],
    [/\b(pizza|sandwich|apple|banana bunch|carrot|cheese)\b/, 'snack'],
    [/\b(trampoline|bounce)\b/, 'trampoline'],
    [/\b(tunnel|cave|hole)\b/, 'tunnel'],
    [/\b(map|compass)\b/, 'map'],
  ];
  function norm(kind) {
    let k = String(kind || '').toLowerCase().trim()
      .replace(/^(a|an|the|some|my|our|big|little|small|tiny|giant)\s+/, '')
      .replace(/[.!?,]+$/, '');
    for (const [re, key] of SYN) if (re.test(k)) return key;
    return k.split(/\s+/).slice(0, 2).join(' ') || 'thing';
  }

  /* gag categories (normalized keys) */
  const RIDE = new Set(['unicorn', 'horse', 'duck', 'dragon', 'boat', 'fish',
    'bike', 'bunny', 'cat', 'teddy', 'trampoline']);
  const SILLY = new Set(['banana peel', 'slime', 'sock', 'homework', 'toaster',
    'fridge', 'anvil', 'cake', 'snack', 'ball']);
  const HEAVY = new Set(['toaster', 'fridge', 'anvil', 'rock']);
  const FLIER = new Set(['bird', 'bee', 'ball', 'cloud', 'star', 'kite']);

  /* ---------- tiny builder helpers ---------- */
  function legs(g, r, xs, y, len, w) {
    for (const x of xs) g.add(S.line(x, y, x + r.rr(-2, 2), y + len,
      { r, strokeWidth: w || 4 }));
  }
  function eye(g, r, x, y, s) {
    s = s || 1;
    g.add(S.ellipse(x, y, 5 * s, 6 * s, { r, fill: '#FFFDF6', strokeWidth: 2 }));
    g.add(S.circle(x + 1.5 * s, y + .5, 2.4 * s, { r, fill: INK, stroke: 'none', strokeWidth: 0 }));
  }
  function smile(g, r, x, y, w) {
    g.add(S.arc(x, y - 4, w, w * .8, Math.PI * .15, Math.PI * .85, { r, strokeWidth: 2.4 }));
  }
  function ear(g, r, x, y, s, fill) {
    g.add(S.tri(x, y, 12 * s, 14 * s, { r, fill: fill || '#FF9EBB', strokeWidth: 2, amp: .8 }));
  }
  function dot(g, r, x, y, rad, fill) {
    g.add(S.circle(x, y, rad, { r, fill, stroke: 'none', strokeWidth: 0 }));
  }

  /* ---------- the builders: draw UP from feet at (0,0) ---------- */
  const B = {
    'banana peel'(g, r) {
      g.add(S.curve([[-16, 0], [-26, -14], [-20, -26]], { r, stroke: '#E8A020', strokeWidth: 7 }));
      g.add(S.curve([[16, 0], [26, -14], [20, -26]], { r, stroke: '#E8A020', strokeWidth: 7 }));
      g.add(S.curve([[0, -2], [-2, -20], [3, -30]], { r, stroke: '#E8A020', strokeWidth: 7 }));
      g.add(S.curve([[-16, 0], [-24, -12], [-18, -23]], { r, stroke: '#FFC53D', strokeWidth: 3.4 }));
      g.add(S.curve([[16, 0], [24, -12], [18, -23]], { r, stroke: '#FFC53D', strokeWidth: 3.4 }));
      g.add(S.ellipse(0, 2, 18, 6, { r, fill: '#FFE49A', strokeWidth: 2 }));
    },
    'unicorn'(g, r) {
      g.add(S.ellipse(0, -46, 44, 26, { r, fill: '#FFFDF6', strokeWidth: 3 }));
      legs(g, r, [-26, -10, 12, 30], -28, 26, 4.5);
      g.add(S.ellipse(34, -66, 16, 12, { r, fill: '#FFFDF6', strokeWidth: 3 }));
      g.add(S.poly([[30, -76], [36, -104], [42, -76]], { r, fill: '#FFC53D', strokeWidth: 2.4 }));
      g.add(S.curve([[14, -70], [4, -84], [10, -96]], { r, stroke: '#F58ACB', strokeWidth: 6 }));
      g.add(S.curve([[-42, -52], [-56, -64], [-60, -50]], { r, stroke: '#B565D8', strokeWidth: 5 }));
      eye(g, r, 39, -68, .9); smile(g, r, 42, -60, 7);
      dot(g, r, 30, -60, 3, '#F58ACB');
    },
    'horse'(g, r) {
      g.add(S.ellipse(0, -44, 42, 24, { r, fill: '#B07A43', hatch: true, hatchGap: 6, strokeWidth: 3 }));
      legs(g, r, [-24, -8, 12, 28], -26, 24, 4.5);
      g.add(S.ellipse(34, -62, 15, 11, { r, fill: '#B07A43', strokeWidth: 3 }));
      g.add(S.poly([[36, -70], [33, -88], [40, -74]], { r, fill: '#6B4A2A', strokeWidth: 2 }));
      g.add(S.curve([[-40, -50], [-54, -58], [-56, -44]], { r, stroke: '#6B4A2A', strokeWidth: 5 }));
      eye(g, r, 38, -64, .9); smile(g, r, 41, -57, 6);
    },
    'duck'(g, r) {
      g.add(S.ellipse(0, -26, 34, 20, { r, fill: '#FFC53D', strokeWidth: 3 }));
      g.add(S.circle(26, -46, 13, { r, fill: '#FFC53D', strokeWidth: 3 }));
      g.add(S.poly([[36, -50], [52, -46], [36, -41]], { r, fill: '#FF9E57', strokeWidth: 2 }));
      g.add(S.curve([[-6, -34], [-16, -44], [-26, -38]], { r, stroke: '#E8A020', strokeWidth: 4 }));
      eye(g, r, 28, -49); legs(g, r, [-6, 8], -8, 8, 3);
    },
    'dragon'(g, r) {
      g.add(S.ellipse(0, -40, 44, 26, { r, fill: '#4FB06D', hatch: true, hatchGap: 7, strokeWidth: 3 }));
      legs(g, r, [-26, -8, 12, 30], -22, 20, 4.5);
      g.add(S.ellipse(36, -62, 17, 13, { r, fill: '#4FB06D', strokeWidth: 3 }));
      g.add(S.poly([[20, -60], [10, -86], [32, -66]], { r, fill: '#8ED1A1', strokeWidth: 2.4 }));
      for (let i = 0; i < 4; i++)
        g.add(S.tri(-34 + i * 18, -60 - i * 2, 10, 10, { r, fill: '#FFC53D', strokeWidth: 1.8, amp: .6 }));
      g.add(S.curve([[-42, -40], [-62, -30], [-58, -14]], { r, stroke: '#3E8F57', strokeWidth: 6 }));
      eye(g, r, 40, -65, .9); smile(g, r, 42, -57, 7);
      g.add(S.curve([[50, -56], [60, -62], [64, -54]], { r, stroke: '#FF9E57', strokeWidth: 4 }));
    },
    'boat'(g, r) {
      g.add(S.path([[-46, -22], [-34, -2], [34, -2], [46, -22]], { r, strokeWidth: 3 }));
      g.add(S.path([[-46, -22], [46, -22]], { r, strokeWidth: 3 }));
      g.add(S.rect(-34, -18, 68, 12, { r, fill: '#B07A43', hatch: true, hatchGap: 5, strokeWidth: 2.2 }));
      g.add(S.line(4, -20, 4, -64, { r, stroke: '#6B4A2A', strokeWidth: 4 }));
      g.add(S.poly([[6, -62], [34, -42], [6, -30]], { r, fill: '#FF6B57', strokeWidth: 2.4 }));
    },
    'fish'(g, r) {
      g.add(S.ellipse(0, -24, 34, 18, { r, fill: '#5DA9E9', hatch: true, hatchGap: 6, hatchAngle: -20, strokeWidth: 3 }));
      g.add(S.poly([[-32, -24], [-50, -36], [-50, -12]], { r, fill: '#3F86C9', strokeWidth: 2.4 }));
      g.add(S.tri(-2, -40, 18, 12, { r, fill: '#3F86C9', strokeWidth: 2 }));
      eye(g, r, 18, -28); smile(g, r, 22, -20, 6);
      g.add(S.arc(-10, -24, 8, 12, -Math.PI / 2, Math.PI / 2, { r, stroke: '#3F86C9', strokeWidth: 2 }));
    },
    'bike'(g, r) {
      g.add(S.circle(-22, -12, 14, { r, strokeWidth: 3 }));
      g.add(S.circle(24, -12, 14, { r, strokeWidth: 3 }));
      g.add(S.path([[-22, -12], [-4, -34], [8, -12], [-22, -12]], { r, strokeWidth: 3 }));
      g.add(S.path([[8, -12], [-4, -34], [24, -12], [14, -36]], { r, strokeWidth: 3 }));
      g.add(S.line(14, -36, 22, -40, { r, strokeWidth: 3 }));
      g.add(S.line(-8, -38, -2, -34, { r, strokeWidth: 4 }));
    },
    'bridge'(g, r) {
      g.add(S.path([[-64, -4], [-30, -34], [30, -34], [64, -4]], { r, stroke: '#8A5E2E', strokeWidth: 6 }));
      g.add(S.path([[-64, 0], [-30, -26], [30, -26], [64, 0]], { r, stroke: '#B07A43', strokeWidth: 10 }));
      for (let i = -3; i <= 3; i++)
        g.add(S.line(i * 17, -8 - (3 - Math.abs(i)) * 5, i * 17, -18 - (3 - Math.abs(i)) * 5,
          { r, stroke: '#6B4A2A', strokeWidth: 2.4 }));
      g.add(S.line(-56, -26, -56, -46, { r, strokeWidth: 3.4 }));
      g.add(S.line(56, -26, 56, -46, { r, strokeWidth: 3.4 }));
      g.add(S.path([[-56, -44], [-20, -56], [20, -56], [56, -44]], { r, strokeWidth: 3 }));
    },
    'log'(g, r) {
      g.add(S.rect(-52, -18, 104, 18, { r, fill: '#9A6A3B', hatch: true, hatchGap: 6, strokeWidth: 3, bow: 3 }));
      g.add(S.circle(52, -9, 9, { r, fill: '#D9A96B', strokeWidth: 2.4 }));
      g.add(S.circle(52, -9, 4.5, { r, strokeWidth: 1.6 }));
      g.add(S.line(-40, -12, 30, -13, { r, stroke: '#6B4A2A', strokeWidth: 1.8 }));
      g.add(S.line(-42, -5, 34, -6, { r, stroke: '#6B4A2A', strokeWidth: 1.8 }));
    },
    'ladder'(g, r) {
      g.add(S.line(-14, 0, -18, -76, { r, stroke: '#8A5E2E', strokeWidth: 4.5 }));
      g.add(S.line(14, 0, 18, -76, { r, stroke: '#8A5E2E', strokeWidth: 4.5 }));
      for (let i = 0; i < 5; i++)
        g.add(S.line(-15 - i * .8, -10 - i * 14, 15 + i * .8, -10 - i * 14, { r, strokeWidth: 3.4 }));
    },
    'vine'(g, r) {
      g.add(S.curve([[0, -4], [-20, -30], [-6, -60], [-22, -90]], { r, stroke: '#3E8F57', strokeWidth: 5 }));
      for (const [x, y, s] of [[-14, -26, -1], [-10, -52, 1], [-18, -74, -1]])
        g.add(S.ellipse(x + 6 * s, y, 9, 5, { r, fill: '#4FB06D', strokeWidth: 1.8 }));
    },
    'umbrella'(g, r) {
      g.add(S.arc(0, -34, 42, 34, Math.PI, Math.PI * 2, { r, strokeWidth: 3 }));
      g.add(S.path([[-42, -34], [-28, -26], [-14, -34], [0, -26], [14, -34], [28, -26], [42, -34]],
        { r, strokeWidth: 3 }));
      g.add(S.line(0, -66, 0, -2, { r, strokeWidth: 3.4 }));
      g.add(S.arc(0, -2, 9, 8, 0, Math.PI, false, { r, strokeWidth: 3 }));
      g.add(S.path([[-30, -52], [-20, -58], [-8, -54]], { r, stroke: '#FF6B57', strokeWidth: 6 }));
      g.add(S.path([[4, -56], [16, -60], [28, -54]], { r, stroke: '#5DA9E9', strokeWidth: 6 }));
    },
    'lantern'(g, r) {
      g.add(S.circle(0, -34, 26, { r, fill: 'rgba(255,213,110,.35)', stroke: 'none', strokeWidth: 0 }));
      g.add(S.rect(-13, -50, 26, 34, { r, fill: '#FFD56E', hatch: true, hatchGap: 5, strokeWidth: 2.8 }));
      g.add(S.rect(-16, -56, 32, 7, { r, fill: '#6B4A2A', strokeWidth: 2.4 }));
      g.add(S.rect(-16, -18, 32, 6, { r, fill: '#6B4A2A', strokeWidth: 2.4 }));
      g.add(S.arc(0, -56, 10, 9, Math.PI, Math.PI * 2, { r, strokeWidth: 2.6 }));
      g.add(S.ellipse(0, -32, 6, 10, { r, fill: '#FF9E57', strokeWidth: 1.8 }));
    },
    'tree'(g, r) {
      g.add(S.line(0, 0, r.rr(-3, 3), -34, { r, stroke: '#8A5E2E', strokeWidth: 7 }));
      g.add(S.line(0, -16, -14, -30, { r, stroke: '#8A5E2E', strokeWidth: 4 }));
      const cols = ['#4FB06D', '#5FBF7B', '#3E9E5C'];
      for (const [dx, dy, rr] of [[-18, -48, 20], [16, -52, 18], [0, -70, 22], [-4, -42, 16]])
        g.add(S.circle(dx, dy, rr, { r, fill: r.pick(cols), hatch: true, hatchGap: 6, strokeWidth: 2.4 }));
    },
    'flower'(g, r) {
      g.add(S.line(0, 0, 0, -30, { r, stroke: '#3E8F57', strokeWidth: 3 }));
      g.add(S.ellipse(-7, -12, 8, 4, { r, fill: '#4FB06D', strokeWidth: 1.8 }));
      const col = r.pick(['#FF6B57', '#F58ACB', '#B565D8', '#FF9E57']);
      for (let i = 0; i < 5; i++) {
        const a = i / 5 * Math.PI * 2 - Math.PI / 2;
        g.add(S.circle(Math.cos(a) * 10, -36 + Math.sin(a) * 10, 6.5, { r, fill: col, strokeWidth: 1.8 }));
      }
      g.add(S.circle(0, -36, 6.5, { r, fill: '#FFC53D', strokeWidth: 2 }));
    },
    'mushroom'(g, r) {
      g.add(S.rect(-8, -22, 16, 22, { r, fill: '#FFF1D6', strokeWidth: 2.4 }));
      g.add(S.arc(0, -22, 24, 20, Math.PI, Math.PI * 2, { r, fill: '#FF6B57', strokeWidth: 2.8 }));
      g.add(S.path([[-24, -22], [24, -22]], { r, strokeWidth: 2.6 }));
      dot(g, r, -10, -36, 3.4, '#FFFDF6'); dot(g, r, 6, -40, 2.8, '#FFFDF6'); dot(g, r, 14, -32, 2.4, '#FFFDF6');
    },
    'rock'(g, r) {
      g.add(S.poly([[-30, 0], [-34, -18], [-16, -34], [10, -38], [30, -24], [34, 0]],
        { r, fill: '#B9AFA0', hatch: true, hatchGap: 6, strokeWidth: 3, tension: .3 }));
      g.add(S.path([[-14, -28], [-2, -20], [4, -10]], { r, stroke: '#8B8378', strokeWidth: 2 }));
    },
    'straw'(g, r) {
      for (let i = 0; i < 9; i++) {
        const x = -18 + i * 4.5;
        g.add(S.curve([[x, 0], [x + r.rr(-6, 6), -18], [x + r.rr(-10, 10), -r.rr(30, 44)]],
          { r, stroke: r.pick(['#E8B33D', '#D9A02E', '#F0C85E']), strokeWidth: 3.4 }));
      }
      g.add(S.arc(0, -10, 24, 10, Math.PI, Math.PI * 2, { r, stroke: '#B98A4F', strokeWidth: 3 }));
    },
    'sticks'(g, r) {
      for (let i = 0; i < 4; i++)
        g.add(S.line(-28 + i * 8, -2 - i * 2, -14 + i * 8 + 30, -8 - i * 2 + r.rr(-3, 3),
          { r, stroke: '#8A5E2E', strokeWidth: 5 }));
      g.add(S.curve([[0, -2], [4, -14], [-2, -22]], { r, stroke: '#6B4A2A', strokeWidth: 2.4 }));
    },
    'bricks'(g, r) {
      const cols = ['#C96A4E', '#D97857', '#B85C42'];
      for (let row = 0; row < 3; row++)
        for (let i = 0; i < 3 - (row % 2); i++) {
          const x = -30 + i * 32 + (row % 2) * 16;
          g.add(S.rect(x, -12 - row * 13, 30, 12, { r, fill: r.pick(cols), strokeWidth: 2, bow: 1.4 }));
        }
    },
    'straw house'(g, r) { house(g, r, '#F0C85E', '#D9A02E', 'zig'); },
    'stick house'(g, r) { house(g, r, '#B07A43', '#8A5E2E', 'planks'); },
    'brick house'(g, r) { house(g, r, '#C96A4E', '#A8543B', 'bricks'); },
    'house'(g, r) { house(g, r, '#C96A4E', '#A8543B', 'bricks'); },
    'pig'(g, r) { piglet(g, r, 1); },
    'wolf'(g, r) { wolfNode(g, r); },
    'door'(g, r) {
      g.add(S.rect(-20, -64, 40, 64, { r, fill: '#8A5E2E', hatch: true, hatchGap: 5, hatchAngle: 90, strokeWidth: 3 }));
      g.add(S.rect(-26, -70, 52, 8, { r, fill: '#6B4A2A', strokeWidth: 2.4 }));
      dot(g, r, 12, -32, 3.4, '#FFC53D');
      g.add(S.circle(12, -32, 5.5, { r, strokeWidth: 2 }));
    },
    'key'(g, r) {
      g.add(S.circle(-14, -30, 11, { r, stroke: '#E8A020', strokeWidth: 5 }));
      g.add(S.circle(-14, -30, 11, { r, stroke: '#FFC53D', strokeWidth: 2.2 }));
      g.add(S.line(-4, -30, 30, -30, { r, stroke: '#E8A020', strokeWidth: 5 }));
      g.add(S.line(20, -30, 20, -22, { r, stroke: '#E8A020', strokeWidth: 4 }));
      g.add(S.line(28, -30, 28, -20, { r, stroke: '#E8A020', strokeWidth: 4 }));
    },
    'cookie jar'(g, r) {
      g.add(S.rect(-20, -44, 40, 42, { r, fill: '#C4E7FB', strokeWidth: 3, bow: 4 }));
      g.add(S.rect(-24, -52, 48, 10, { r, fill: '#FF6B57', strokeWidth: 2.6 }));
      dot(g, r, -8, -30, 4.6, '#B07A43'); dot(g, r, 6, -22, 4.2, '#B07A43'); dot(g, r, 4, -36, 3.6, '#8A5E2E');
    },
    'cake'(g, r) {
      g.add(S.rect(-26, -18, 52, 18, { r, fill: '#F58ACB', strokeWidth: 2.6 }));
      g.add(S.rect(-20, -32, 40, 15, { r, fill: '#FFF1D6', strokeWidth: 2.4 }));
      g.add(S.line(0, -32, 0, -44, { r, stroke: '#E8A020', strokeWidth: 3 }));
      dot(g, r, 0, -47, 3.6, '#FFC53D');
      for (let i = -2; i <= 2; i++) dot(g, r, i * 10, -14, 2.4, '#FFFDF6');
    },
    'treasure'(g, r) {
      g.add(S.rect(-30, -30, 60, 30, { r, fill: '#9A6A3B', hatch: true, hatchGap: 6, strokeWidth: 3 }));
      g.add(S.arc(0, -30, 30, 18, Math.PI, Math.PI * 2, { r, fill: '#B07A43', strokeWidth: 3 }));
      g.add(S.rect(-5, -34, 10, 12, { r, fill: '#FFC53D', strokeWidth: 2 }));
      dot(g, r, -12, -36, 3, '#FFC53D'); dot(g, r, 14, -37, 2.6, '#FFC53D');
    },
    'toaster'(g, r) {
      g.add(S.rect(-28, -38, 56, 38, { r, fill: '#8B93A8', hatch: true, hatchGap: 6, strokeWidth: 3 }));
      g.add(S.line(-14, -40, -14, -46, { r, strokeWidth: 4 }));
      g.add(S.line(14, -40, 14, -46, { r, strokeWidth: 4 }));
      g.add(S.rect(-34, -30, 8, 16, { r, fill: '#6E768C', strokeWidth: 2 }));
      g.add(S.rect(-16, -44, 32, 5, { r, fill: '#FFF1D6', strokeWidth: 2 }));
      eye(g, r, -8, -20, .8); smile(g, r, 0, -12, 7);
    },
    'fridge'(g, r) {
      g.add(S.rect(-26, -74, 52, 74, { r, fill: '#C4E7FB', hatch: true, hatchGap: 7, strokeWidth: 3 }));
      g.add(S.line(-26, -48, 26, -48, { r, strokeWidth: 2.6 }));
      g.add(S.line(18, -64, 18, -54, { r, strokeWidth: 4 }));
      g.add(S.line(18, -40, 18, -28, { r, strokeWidth: 4 }));
      g.add(S.rect(-14, -38, 18, 14, { r, fill: '#FFC53D', strokeWidth: 1.8 }));
      dot(g, r, -10, -56, 2.2, '#FF6B57'); dot(g, r, 0, -60, 2.2, '#4FB06D');
    },
    'anvil'(g, r) {
      g.add(S.poly([[-38, -30], [38, -30], [26, -14], [-26, -14]], { r, fill: '#6E768C', hatch: true, strokeWidth: 3 }));
      g.add(S.rect(-14, -14, 28, 14, { r, fill: '#8B93A8', strokeWidth: 2.6 }));
      g.add(S.poly([[38, -30], [52, -36], [38, -18]], { r, fill: '#6E768C', strokeWidth: 2.6 }));
    },
    'sock'(g, r) {
      g.add(S.poly([[-10, -46], [10, -46], [10, -18], [26, -10], [18, -2], [-2, -2], [-10, -14]],
        { r, fill: '#B565D8', hatch: true, hatchGap: 6, strokeWidth: 2.8 }));
      g.add(S.rect(-12, -50, 24, 9, { r, fill: '#DCC3F2', strokeWidth: 2.4 }));
      g.add(S.arc(17, -10, 8, 6, 0, Math.PI, false, { r, stroke: '#DCC3F2', strokeWidth: 3 }));
    },
    'slime'(g, r) {
      g.add(S.ellipse(0, -8, 40, 12, { r, fill: '#8ED1A1', hatch: true, hatchGap: 6, hatchAngle: 10, strokeWidth: 2.8 }));
      g.add(S.ellipse(-14, -18, 14, 10, { r, fill: '#8ED1A1', strokeWidth: 2.4 }));
      g.add(S.ellipse(12, -20, 18, 12, { r, fill: '#7CC790', strokeWidth: 2.4 }));
      g.add(S.circle(26, -34, 5, { r, fill: '#A8E3B8', strokeWidth: 1.8 }));
      g.add(S.circle(36, -24, 3.4, { r, fill: '#A8E3B8', strokeWidth: 1.6 }));
    },
    'homework'(g, r) {
      for (let i = 0; i < 3; i++)
        g.add(S.rect(-24 + i * 5, -8 - i * 9, 44, 8, { r, fill: '#FFFDF6', strokeWidth: 2 }));
      g.add(S.line(-18, -30, 10, -30, { r, stroke: '#8B93A8', strokeWidth: 1.8 }));
      g.add(S.line(-18, -27, 14, -27, { r, stroke: '#8B93A8', strokeWidth: 1.8 }));
      g.add(S.scribbleText('ABC', -12, -24, { fontSize: 11, fill: '#8B93A8' }));
    },
    'star'(g, r) {
      g.add(S.star(0, -40, 22, 10, 5, { r, strokeWidth: 2.6 }));
      dot(g, r, -4, -44, 1.8, INK); dot(g, r, 5, -44, 1.8, INK);
      smile(g, r, 0, -36, 6);
    },
    'cloud'(g, r) { cloudShape(g, r, 0, -70, 1); },
    'sun'(g, r) {
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * Math.PI * 2;
        g.add(S.line(Math.cos(a) * 30, -78 + Math.sin(a) * 30,
          Math.cos(a) * 40, -78 + Math.sin(a) * 40, { r, stroke: '#E8A020', strokeWidth: 3 }));
      }
      g.add(S.circle(0, -78, 24, { r, fill: '#FFC53D', hatch: true, hatchGap: 5, hatchAngle: 40, strokeWidth: 3 }));
      dot(g, r, -7, -80, 2.2, INK); dot(g, r, 8, -80, 2.2, INK);
      smile(g, r, 0, -72, 8);
    },
    'moon'(g, r) {
      g.add(S.arc(0, -70, 26, 26, Math.PI * .35, Math.PI * 1.65, { r, stroke: '#C9BEC8', strokeWidth: 5 }));
      g.add(S.arc(10, -70, 22, 22, Math.PI * .4, Math.PI * 1.6, { r, stroke: '#C9BEC8', strokeWidth: 3 }));
      dot(g, r, -16, -84, 2, '#C9BEC8'); dot(g, r, -20, -60, 1.6, '#C9BEC8');
    },
    'rainbow'(g, r) {
      const cols = ['#FF6B57', '#FF9E57', '#FFC53D', '#4FB06D', '#5DA9E9', '#B565D8'];
      cols.forEach((c, i) => g.add(S.arc(0, 0, 64 - i * 8, 64 - i * 8, Math.PI, Math.PI * 2,
        { r, stroke: c, strokeWidth: 7 })));
      cloudShape(g, r, -60, -6, .6); cloudShape(g, r, 60, -6, .6);
    },
    'ball'(g, r) {
      g.add(S.circle(0, -26, 22, { r, fill: '#FF6B57', strokeWidth: 3 }));
      g.add(S.arc(0, -26, 22, 22, -Math.PI / 2, Math.PI / 2, { r, stroke: '#FFFDF6', strokeWidth: 5 }));
      g.add(S.circle(0, -26, 4, { r, fill: '#FFFDF6', strokeWidth: 2 }));
    },
    'bird'(g, r) {
      g.add(S.ellipse(0, -56, 16, 12, { r, fill: '#5DA9E9', strokeWidth: 2.6 }));
      g.add(S.circle(12, -64, 8, { r, fill: '#5DA9E9', strokeWidth: 2.4 }));
      g.add(S.poly([[18, -66], [27, -63], [18, -60]], { r, fill: '#FF9E57', strokeWidth: 1.8 }));
      g.add(S.arc(-4, -58, 9, 7, Math.PI * 1.1, Math.PI * 1.9, false, { r, stroke: '#3F86C9', strokeWidth: 2.4 }));
      dot(g, r, 14, -66, 1.8, INK);
      g.add(S.line(-14, -56, -22, -60, { r, stroke: '#3F86C9', strokeWidth: 2.6 }));
      g.add(S.line(-2, -44, -2, -38, { r, strokeWidth: 2 }));
      g.add(S.line(4, -44, 4, -38, { r, strokeWidth: 2 }));
    },
    'cat'(g, r) {
      g.add(S.ellipse(0, -22, 24, 18, { r, fill: '#FF9E57', hatch: true, hatchGap: 6, strokeWidth: 2.8 }));
      g.add(S.circle(4, -46, 15, { r, fill: '#FF9E57', strokeWidth: 2.8 }));
      ear(g, r, -4, -54, .9, '#FF9E57'); ear(g, r, 12, -54, .9, '#FF9E57');
      g.add(S.curve([[22, -18], [36, -30], [30, -44]], { r, stroke: '#E8814E', strokeWidth: 4.5 }));
      eye(g, r, -1, -48, .8); eye(g, r, 10, -48, .8);
      dot(g, r, 4, -42, 1.6, '#D96A3B');
      g.add(S.line(-8, -40, -18, -38, { r, strokeWidth: 1.4 }));
      g.add(S.line(16, -40, 26, -38, { r, strokeWidth: 1.4 }));
    },
    'bunny'(g, r) {
      g.add(S.ellipse(0, -20, 22, 16, { r, fill: '#EDEAF4', strokeWidth: 2.8 }));
      g.add(S.circle(10, -42, 13, { r, fill: '#EDEAF4', strokeWidth: 2.8 }));
      g.add(S.ellipse(2, -66, 5, 14, { r, fill: '#EDEAF4', strokeWidth: 2.2 }));
      g.add(S.ellipse(15, -66, 5, 14, { r, fill: '#EDEAF4', strokeWidth: 2.2 }));
      g.add(S.ellipse(2.4, -66, 2, 8, { r, fill: '#F58ACB', strokeWidth: 1.4 }));
      g.add(S.ellipse(15.4, -66, 2, 8, { r, fill: '#F58ACB', strokeWidth: 1.4 }));
      eye(g, r, 15, -44, .7);
      dot(g, r, -20, -20, 5, '#FFFDF6');
      dot(g, r, 21, -39, 1.8, '#F58ACB');
    },
    'bee'(g, r) {
      g.add(S.ellipse(0, -58, 16, 11, { r, fill: '#FFC53D', strokeWidth: 2.6 }));
      g.add(S.line(-5, -68, -5, -48, { r, strokeWidth: 3 }));
      g.add(S.line(4, -68.5, 4, -47.5, { r, strokeWidth: 3 }));
      g.add(S.ellipse(-4, -74, 9, 6, { r, fill: 'rgba(196,231,251,.8)', strokeWidth: 1.8 }));
      g.add(S.ellipse(8, -74, 9, 6, { r, fill: 'rgba(196,231,251,.8)', strokeWidth: 1.8 }));
      dot(g, r, 13, -60, 1.8, INK);
      g.add(S.curve([[16, -58], [26, -62], [34, -56]], { r, stroke: '#C9A06B', strokeWidth: 1.8, dash: [3, 4] }));
    },
    'rain cloud'(g, r) {
      cloudShape(g, r, 0, -78, .9, '#B9C6D6');
      for (const dx of [-18, 0, 18])
        g.add(S.line(dx - 4, -62, dx - 10, -44, { r, stroke: '#7FB8E8', strokeWidth: 3 }));
    },
    'snow'(g, r) {
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * Math.PI * 2;
        g.add(S.line(0, -50, Math.cos(a) * 18, -50 + Math.sin(a) * 18, { r, stroke: '#9FD0F2', strokeWidth: 2.6 }));
        g.add(S.circle(Math.cos(a) * 18, -50 + Math.sin(a) * 18, 2.4, { r, fill: '#C4E7FB', strokeWidth: 1.4 }));
      }
      dot(g, r, 0, -50, 3, '#C4E7FB');
    },
    'fence'(g, r) {
      for (let i = -2; i <= 2; i++)
        g.add(S.rect(i * 18 - 4, -34, 8, 34, { r, fill: '#C9A06B', strokeWidth: 2, bow: 1.2 }));
      g.add(S.rect(-44, -28, 88, 7, { r, fill: '#B07A43', strokeWidth: 2, bow: 2 }));
    },
    'sign'(g, r) {
      g.add(S.line(0, 0, 0, -50, { r, stroke: '#8A5E2E', strokeWidth: 5 }));
      g.add(S.poly([[-30, -62], [22, -62], [32, -54], [22, -46], [-30, -46]],
        { r, fill: '#FFF1D6', strokeWidth: 2.6 }));
      g.add(S.line(-22, -54, 12, -54, { r, stroke: '#B9A78A', strokeWidth: 2.4 }));
    },
    'teddy'(g, r) {
      g.add(S.circle(0, -30, 20, { r, fill: '#B07A43', hatch: true, hatchGap: 6, strokeWidth: 2.8 }));
      g.add(S.circle(0, -56, 14, { r, fill: '#B07A43', strokeWidth: 2.8 }));
      g.add(S.circle(-11, -66, 6, { r, fill: '#B07A43', strokeWidth: 2.2 }));
      g.add(S.circle(11, -66, 6, { r, fill: '#B07A43', strokeWidth: 2.2 }));
      g.add(S.ellipse(0, -26, 9, 7, { r, fill: '#D9A96B', strokeWidth: 2 }));
      g.add(S.ellipse(0, -52, 6, 4.6, { r, fill: '#D9A96B', strokeWidth: 1.8 }));
      dot(g, r, -5, -58, 1.8, INK); dot(g, r, 5, -58, 1.8, INK); dot(g, r, 0, -53, 1.6, INK);
    },
    'robot'(g, r) {
      g.add(S.rect(-18, -56, 36, 30, { r, fill: '#8B93A8', hatch: true, hatchGap: 6, strokeWidth: 2.8 }));
      g.add(S.rect(-14, -26, 28, 22, { r, fill: '#6E768C', strokeWidth: 2.6 }));
      g.add(S.line(0, -56, 0, -66, { r, strokeWidth: 2.6 }));
      dot(g, r, 0, -69, 3.4, '#FF6B57');
      dot(g, r, -7, -46, 2.6, '#FFC53D'); dot(g, r, 7, -46, 2.6, '#FFC53D');
      g.add(S.rect(-9, -38, 18, 4, { r, fill: '#FFFDF6', strokeWidth: 1.8 }));
      g.add(S.line(-24, -22, -14, -20, { r, strokeWidth: 4 }));
      g.add(S.line(14, -20, 24, -22, { r, strokeWidth: 4 }));
      legs(g, r, [-7, 7], -4, 4, 3.4);
    },
    'ghost'(g, r) {
      g.add(S.path([[-20, 0], [-20, -46], [0, -66], [20, -46], [20, 0]], { r, strokeWidth: 2.8, fill: 'rgba(255,253,246,.9)', tension: .5 }));
      g.add(S.curve([[-20, 0], [-14, -8], [-8, 0], [-2, -8], [4, 0], [10, -8], [16, 0], [20, -8]],
        { r, strokeWidth: 2.8 }));
      dot(g, r, -7, -44, 2.6, INK); dot(g, r, 7, -44, 2.6, INK);
      g.add(S.ellipse(0, -34, 4, 6, { r, fill: INK, strokeWidth: 1.4 }));
    },
    'snack'(g, r) {
      g.add(S.poly([[-24, -6], [0, -44], [24, -6]], { r, fill: '#FFC53D', strokeWidth: 2.8 }));
      g.add(S.arc(0, -6, 24, 8, 0, Math.PI, false, { r, stroke: '#E8A020', strokeWidth: 3 }));
      dot(g, r, -6, -20, 3, '#FF6B57'); dot(g, r, 6, -26, 3, '#FF6B57'); dot(g, r, 0, -12, 2.6, '#FF6B57');
    },
    'trampoline'(g, r) {
      g.add(S.ellipse(0, -18, 44, 12, { r, fill: '#5DA9E9', strokeWidth: 3 }));
      g.add(S.ellipse(0, -20, 36, 9, { r, fill: '#2B2118', strokeWidth: 2 }));
      legs(g, r, [-30, -10, 10, 30], -10, 10, 3.4);
      g.add(S.arc(0, -38, 16, 12, Math.PI, Math.PI * 2, { r, stroke: '#FF6B57', strokeWidth: 2.4, dash: [4, 4] }));
    },
    'tunnel'(g, r) {
      g.add(S.arc(0, 0, 44, 52, Math.PI, Math.PI * 2, { r, fill: '#6E6257', strokeWidth: 3.4 }));
      g.add(S.arc(0, 0, 30, 38, Math.PI, Math.PI * 2, { r, fill: '#2B2118', strokeWidth: 2.6 }));
      for (let i = -2; i <= 2; i++)
        g.add(S.ellipse(i * 18, -4, 9, 5, { r, fill: '#B9AFA0', strokeWidth: 1.8 }));
    },
    'map'(g, r) {
      g.add(S.rect(-26, -44, 52, 40, { r, fill: '#FFF1D6', strokeWidth: 2.6, bow: 3 }));
      g.add(S.curve([[-18, -14], [-6, -30], [8, -18], [18, -34]], { r, stroke: '#B98A4F', strokeWidth: 2.2, dash: [5, 5] }));
      g.add(S.line(14, -38, 22, -30, { r, stroke: '#FF6B57', strokeWidth: 2.6 }));
      g.add(S.line(22, -38, 14, -30, { r, stroke: '#FF6B57', strokeWidth: 2.6 }));
    },
  };

  /* shared bits */
  function house(g, r, wall, roof, kind) {
    const W = 84, H = 62;
    if (kind === 'bricks') {
      g.add(S.rect(-W / 2, -H, W, H, { r, fill: wall, strokeWidth: 3 }));
      for (let row = 0; row < 4; row++)
        for (let i = 0; i < 4 - (row % 2); i++)
          g.add(S.rect(-W / 2 + 4 + i * 20 + (row % 2) * 10, -H + 6 + row * 14, 17, 11,
            { r, stroke: roof, strokeWidth: 1.4, bow: 1 }));
    } else if (kind === 'planks') {
      g.add(S.rect(-W / 2, -H, W, H, { r, fill: '#C9A06B', strokeWidth: 3 }));
      for (let i = 0; i < 6; i++)
        g.add(S.line(-W / 2 + 6 + i * 13, -H + 4, -W / 2 + 6 + i * 13 + r.rr(-2, 2), -6,
          { r, stroke: wall, strokeWidth: 6 }));
    } else {
      g.add(S.rect(-W / 2, -H, W, H, { r, fill: wall, strokeWidth: 3 }));
      for (let i = 0; i < 12; i++) {
        const x = r.rr(-W / 2 + 4, W / 2 - 4);
        g.add(S.line(x, r.rr(-H + 2, -6), x + r.rr(-5, 5), r.rr(-H + 2, -6),
          { r, stroke: roof, strokeWidth: 2 }));
      }
    }
    g.add(S.poly([[-W / 2 - 8, -H], [W / 2 + 8, -H], [0, -H - 34]], {
      r, fill: kind === 'bricks' ? '#8A5E2E' : roof, strokeWidth: 3, tension: .2 }));
    g.add(S.rect(-10, -26, 20, 26, { r, fill: '#6B4A2A', strokeWidth: 2.4 }));
    dot(g, r, 6, -14, 2, '#FFC53D');
    g.add(S.rect(-32, -50, 18, 18, { r, fill: '#FFF6C9', strokeWidth: 2.2 }));
    g.add(S.line(-23, -50, -23, -32, { r, strokeWidth: 1.4 }));
    g.add(S.line(-32, -41, -14, -41, { r, strokeWidth: 1.4 }));
  }
  function piglet(g, r, s) {
    g.add(S.ellipse(0, -22 * s, 24 * s, 18 * s, { r, fill: '#FF9EBB', hatch: true, hatchGap: 6, strokeWidth: 2.8 }));
    g.add(S.circle(16 * s, -38 * s, 13 * s, { r, fill: '#FF9EBB', strokeWidth: 2.8 }));
    ear(g, r, 8 * s, -48 * s, .8 * s); ear(g, r, 22 * s, -48 * s, .8 * s);
    g.add(S.ellipse(24 * s, -38 * s, 6 * s, 5 * s, { r, fill: '#FFC9D9', strokeWidth: 2 }));
    dot(g, r, 22.4 * s, -38 * s, 1 * s, INK); dot(g, r, 25.6 * s, -38 * s, 1 * s, INK);
    dot(g, r, 14 * s, -42 * s, 1.8 * s, INK);
    g.add(S.arc(18 * s, -34 * s, 5 * s, 4 * s, Math.PI * .1, Math.PI * .9, false, { r, strokeWidth: 1.8 }));
    g.add(S.curve([[-22 * s, -24 * s], [-30 * s, -30 * s], [-26 * s, -34 * s], [-30 * s, -30 * s]],
      { r, stroke: '#F58ACB', strokeWidth: 2.6 }));
    legs(g, r, [-12 * s, -2 * s, 8 * s], -6 * s, 6 * s, 3.4 * s);
  }
  function wolfNode(g, r) {
    g.add(S.ellipse(0, -30, 34, 20, { r, fill: '#8B93A8', hatch: true, hatchGap: 6, strokeWidth: 3 }));
    g.add(S.poly([[24, -56], [44, -46], [30, -40], [52, -42], [34, -34]],
      { r, fill: '#8B93A8', strokeWidth: 2.8 }));
    g.add(S.tri(30, -50, 12, 14, { r, fill: '#8B93A8', strokeWidth: 2.2 }));
    g.add(S.tri(42, -44, 10, 12, { r, fill: '#8B93A8', strokeWidth: 2 }));
    dot(g, r, 36, -44, 2.2, INK);
    g.add(S.ellipse(50, -42, 5, 4, { r, fill: '#6E768C', strokeWidth: 1.8 }));
    g.add(S.arc(44, -34, 6, 4, Math.PI * .1, Math.PI * .9, false, { r, strokeWidth: 2 }));
    g.add(S.curve([[-32, -34], [-48, -44], [-52, -30]], { r, stroke: '#6E768C', strokeWidth: 6 }));
    legs(g, r, [-20, -6, 10, 22], -12, 12, 4);
  }
  function cloudShape(g, r, x, y, s, col) {
    s = s || 1; col = col || '#FFFDF6';
    g.add(S.ellipse(x - 16 * s, y + 4 * s, 16 * s, 10 * s, { r, fill: col, strokeWidth: 2.2 }));
    g.add(S.ellipse(x, y - 3 * s, 21 * s, 14 * s, { r, fill: col, strokeWidth: 2.2 }));
    g.add(S.ellipse(x + 17 * s, y + 4 * s, 15 * s, 10 * s, { r, fill: col, strokeWidth: 2.2 }));
  }

  /* generic fallback: a wobbly scribble-blob + the word itself */
  function generic(kind, g, r) {
    const col = r.pick(['#FF9E57', '#8ED1A1', '#9FCDF2', '#DCC3F2', '#FFD9A0']);
    g.add(S.ellipse(0, -26, 30, 22, { r, fill: col, hatch: true, hatchGap: 6, strokeWidth: 2.8 }));
    eye(g, r, -8, -30, .8); eye(g, r, 8, -30, .8);
    g.add(S.arc(0, -22, 8, 6, Math.PI * .1, Math.PI * .9, false, { r, strokeWidth: 2.2 }));
    g.add(S.line(-10, -4, -14, 0, { r, strokeWidth: 3 }));
    g.add(S.line(10, -4, 14, 0, { r, strokeWidth: 3 }));
    g.add(S.scribbleText(String(kind), -Math.min(44, String(kind).length * 4.4), -72,
      { fontSize: 15, rotation: -3 }));
    g.add(S.star(24, -52, 7, 3, 4, { r, strokeWidth: 1.6 }));
  }

  /* ---------- public API ---------- */
  function build(kind, seed) {
    const key = norm(kind);
    const r = S.rng((seed | 0) + key.length * 131 + key.charCodeAt(0) * 17);
    const g = new Konva.Group({ name: String(kind) });
    g.setAttr('prop', true);
    g.setAttr('kind', key);
    (B[key] || ((gg, rr) => generic(kind, gg, rr)))(g, r);
    /* invisible hit card so the whole doodle is hoverable as ONE node */
    const bb = g.getClientRect();
    if (bb.width > 0) g.add(new Konva.Rect({
      x: bb.x - 4, y: bb.y - 4, width: bb.width + 8, height: bb.height + 8,
      fill: 'rgba(0,0,0,0)', name: 'hitcard',
    }));
    return g;
  }
  window.PROPS = { build, norm, RIDE, SILLY, HEAVY, FLIER };
})();
