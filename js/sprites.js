// Sprite grids and palettes. Every sprite is a small grid of palette characters, turned into
// canvases at first use. '1'-'4' index the owning dimension's ramp (dark to light), so the same
// grid can be drawn in any dimension's colours. Mirrored sprites only define their left half.

export const PAL = {
  k: '#0b0b14',   // outline
  o: '#05050a',   // voids: pupils, mouths
  w: '#f4f4f4',
  r: '#ff3b3b',
  y: '#ffd23f',
};

export const DIMS = {
  vesh:     { name: 'Vesh',       ramp: ['#0f3d1a', '#2f8f2a', '#8be025', '#e4ff7a'] },
  ulta:     { name: 'Ulta-9',     ramp: ['#2a104d', '#6b2fb5', '#b46bff', '#f0c8ff'] },
  hollow:   { name: 'The Hollow', ramp: ['#2c3a55', '#7f9bc4', '#d5e6ff', '#ffffff'] },
  miridian: { name: 'Miridian',   ramp: ['#4d2600', '#b55e0a', '#ffa91f', '#ffe9a0'] },
  unknown:  { name: 'Unknown',    ramp: ['#3d060c', '#99101c', '#f02a2a', '#ff9a7a'] },
};

const GRIDS = {
  yrrk: { mirror: true, frames: [[
    '..k.....',
    '.k4k....',
    '.k3k.kkk',
    '..k3k333',
    '.k333333',
    'k33ww333',
    'k33wo333',
    'k3333333',
    'k2kwkwkw',
    'k2kkkkkk',
    'k2wkwkwk',
    'k2222222',
    '.k222222',
    '..kkkkkk',
    '..k..k..',
  ], [
    '.k......',
    '.k4k....',
    '..k3kkkk',
    '..k3k333',
    '.k333333',
    'k33ww333',
    'k33wo333',
    'k3333333',
    'k2kwkwkw',
    'k2kkkkkk',
    'k2kkkkkk',
    'k2wkwkwk',
    '.k222222',
    '..kkkkkk',
    '.k....k.',
  ]] },

  glomm: { mirror: true, frames: [[
    'kk........',
    'k3k.......',
    'k2k...kkkk',
    '.k2k.k3333',
    '.k2kk33333',
    '..k2333443',
    '..k333ww33',
    '..k333wo33',
    '.k33333333',
    '.k333kkkkk',
    '.k23kwkwkw',
    '.k23kkkkkk',
    '.k22333333',
    '..k2222333',
    '...kk22222',
    '.....kkkkk',
  ], [
    '..........',
    'kk........',
    'k3k...kkkk',
    'k2k..k3333',
    '.k2kk33333',
    '..k2333443',
    '..k333ww33',
    '..k333ow33',
    '.k33333333',
    '.k333kkkkk',
    '.k23kwkwkw',
    '.k23kkkkkk',
    '.k23kwkwkw',
    '.k22333333',
    '..kk222222',
    '....kkkkkk',
  ]] },

  // Two poses, not an animation: a Skaith is never seen moving.
  skaith: { mirror: true, frames: [[
    '....kkk',
    '...k444',
    '..k4444',
    '..k4oo4',
    '..k4oo4',
    '..k4444',
    '...k44o',
    '...k444',
    '....k33',
    '.kkkk33',
    'k333333',
    'k3kk323',
    'k3k.k33',
    'k3k.k23',
    'k3k.k33',
    'k3k.k23',
    'k3k..k3',
    'k3k..k3',
    'k3k.k33',
    'k4k.k33',
    'kkk.k3k',
    'k.k.k3k',
    '....k3k',
    '....k3k',
    '....k2k',
    '....k2k',
    '...k22k',
    '...kkkk',
  ], [
    'k...kkk',
    'k4.k444',
    'k3k4444',
    'k3k4oo4',
    'k3k4oo4',
    'k3k4444',
    'k3kk44o',
    'k3kk444',
    'k33kk33',
    '.k33333',
    '..kk333',
    '...k323',
    '...kk33',
    '....k23',
    '....k33',
    '....k23',
    '.....k3',
    '.....k3',
    '....k33',
    '....k33',
    '....k3k',
    '....k3k',
    '....k3k',
    '....k3k',
    '....k2k',
    '....k2k',
    '...k22k',
    '...kkkk',
  ]] },

  // Frames: watching, charging its glare, blinking after a jump.
  ootheen: { mirror: true, frames: [[
    '....kkkk',
    '..kk3333',
    '.k33wwww',
    '.k3wwwww',
    'k3wwww22',
    'k3www22o',
    'k3www2oo',
    'k3www2oo',
    'k3www22o',
    'k3wwww22',
    '.k3wwwww',
    '.k33wwww',
    '..kk3333',
    '...k.kkk',
    '..k..k..',
    '..k...k.',
  ], [
    '....kkkk',
    '..kk3333',
    '.k33wwww',
    '.k3wwrrr',
    'k3wwrroo',
    'k3wrrooo',
    'k3wrrooo',
    'k3wrrooo',
    'k3wrrooo',
    'k3wwrroo',
    '.k3wwrrr',
    '.k33wwww',
    '..kk3333',
    '...k.kkk',
    '.k...k..',
    '.k....k.',
  ], [
    '....kkkk',
    '..kk3333',
    '.k333333',
    '.k333333',
    'k3333333',
    'k3322222',
    'k32kkkkk',
    'k3322222',
    'k3333333',
    'k3333333',
    '.k333333',
    '.k333333',
    '..kk3333',
    '...k.kkk',
    '..k..k..',
    '..k...k.',
  ]] },

  // The Ummagog is assembled from these parts in creatures/ummagog.js.
  core: { mirror: true, frames: [[
    '..........kkkkkk',
    '.......kkk222222',
    '.....kk222233333',
    '....k22233333333',
    '...k222333334433',
    '..k2223333333443',
    '..k223k333333333',
    '.k223kwk33333333',
    '.k223kok3333kkkk',
    '.k2233k333kkoooo',
    'k222333333kooooo',
    'k22233333kowowow',
    'k2223333koowowow',
    'k1223333kooooooo',
    'k1223333kooooooo',
    'k12233333koooooo',
    '.k1223333koooooo',
    '.k12233333kkoooo',
    '.k1122333333kkkk',
    '..k1122333333333',
    '...k112222333333',
    '....kk1122222222',
    '......kk11111111',
    '........kkkkkkkk',
  ]] },

  jaw: { mirror: true, frames: [[
    '.k.w.w.w.w',
    'k2kwkwkwkw',
    'k22kkkkkkk',
    'k122222222',
    '.k11222222',
    '..kk111111',
    '....kkkkkk',
  ]] },

  seg: { mirror: true, frames: [[
    '..kk',
    '.k23',
    'k233',
    'k233',
    'k223',
    'k122',
    '.k12',
    '..kk',
  ]] },

  // Weak point: armoured, exposed, destroyed.
  pod: { mirror: true, frames: [[
    '...kkk',
    '.kk222',
    '.k2221',
    'k22211',
    'k2211k',
    'k221kk',
    'k221kk',
    'k2211k',
    'k22211',
    '.k2221',
    '.kk222',
    '...kkk',
  ], [
    '...kkk',
    '.kk333',
    '.k3yyy',
    'k3yyww',
    'k3ywwo',
    'k3ywoo',
    'k3ywoo',
    'k3ywwo',
    'k3yyww',
    '.k3yyy',
    '.kk333',
    '...kkk',
  ], [
    '...kkk',
    '.kk1k1',
    '.k1kok',
    'k1kooo',
    'kk1ooo',
    'k1oooo',
    'k1kooo',
    'kk1ooo',
    'k1kooo',
    '.k1kok',
    '.kk1k1',
    '...kkk',
  ]] },
};

// The Ummagog's young are Yrrk-shaped.
GRIDS.spawnling = GRIDS.yrrk;

const cache = new Map();

function paint(rows, colorOf) {
  const c = document.createElement('canvas');
  c.width = rows[0].length;
  c.height = rows.length;
  const g = c.getContext('2d');
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const col = colorOf(row[x]);
      if (col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); }
    }
  });
  return c;
}

// Returns { w, h, frames, flash }: flash holds a white silhouette of each frame, for hit flashes.
export function getSprite(name, dim) {
  const key = name + '/' + dim;
  let s = cache.get(key);
  if (s) return s;
  const def = GRIDS[name], ramp = DIMS[dim].ramp;
  const grids = def.frames.map(rows => {
    const full = def.mirror ? rows.map(r => r + [...r].reverse().join('')) : rows;
    if (full.some(r => r.length !== full[0].length)) console.warn(`sprite ${name}: ragged rows`);
    return full;
  });
  const colour = ch => (ch === '.' ? null : ch >= '1' && ch <= '4' ? ramp[ch - 1] : PAL[ch]);
  s = {
    w: grids[0][0].length,
    h: grids[0].length,
    frames: grids.map(g => paint(g, colour)),
    flash: grids.map(g => paint(g, ch => (ch === '.' ? null : '#ffffff'))),
  };
  cache.set(key, s);
  return s;
}
