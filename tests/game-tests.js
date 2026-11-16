// Ant Annihilator test suite. Each test gets `g` (the game's internals, exposed by the
// runner through a hook injected into a copy of dist/index.html) and `h` (helpers).
// Loaded by tests/index.html; run headless with `python tests/run_tests.py`.

window.GAME_TESTS = [];
const test = (name, fn) => window.GAME_TESTS.push({ name, fn });

function assert(cond, msg) { if (!cond) throw new Error(msg); }
function approx(actual, expected, tol = 1e-6, label = '') {
  if (!(Math.abs(actual - expected) <= tol)) throw new Error(`${label ? label + ': ' : ''}expected ${expected} (±${tol}), got ${actual}`);
}
function same(actual, expected, label = '') {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${label ? label + ': ' : ''}expected ${e}, got ${a}`);
}

// ---------- weapons ----------

test('Bug Blaster: 4.6 shots/sec at start, about 6.6 at max, 1.6 damage +0.4 per level', async (g) => {
  approx(1 / g.bDelay(0), 4.6, 0.01, 'start fire rate');
  approx(1 / g.bDelay(8), 6.6, 0.1, 'max fire rate');
  approx(g.bDmg(0), 1.6, 1e-9, 'base damage');
  approx(g.bDmg(1), 2.0, 1e-9, 'level 1 damage');
});

test('Split Nozzle: up to 3 streams doing 100% / 50% / 25%', async (g) => {
  same(g.STREAM_DMG, [1, 0.5, 0.25], 'stream damage');
  same(g.UPGRADES.find(u => u.id === 'bSpread').max, 2, 'Split Nozzle levels');
});

test('Sniper starts at 23 damage; Zapper does 3 +1.4 per level and chains 4 ants', async (g) => {
  approx(g.sDmg(0), 23, 1e-9, 'sniper');
  approx(g.zDmg(0), 3, 1e-9, 'zapper base');
  approx(g.zDmg(1), 4.4, 1e-9, 'zapper level 1');
  same(g.zChain(0), 4, 'zapper chain');
});

test('Trap upgrades add 20 seconds each (40s -> 120s)', async (g) => {
  same(g.trapLife(0), 40);
  same(g.trapLife(4), 120);
});

test('Close shots hit harder, far shots weaker; the sniper is the opposite', async (g, h) => {
  approx(g.rangeMult(2, 'blaster'), 1.3, 1e-9, 'blaster close');
  approx(g.rangeMult(30, 'blaster'), 0.6, 1e-9, 'blaster far');
  approx(g.rangeMult(2, 'sniper'), 0.6, 1e-9, 'sniper close');
  approx(g.rangeMult(30, 'sniper'), 1.3, 1e-9, 'sniper far');
  await h.fresh();
  g.player.pos.set(0, 0, 0);
  const near = h.spawn('titan', 2, 0), far = h.spawn('titan', 30, 0);
  approx(h.hit(near, 10, 'blaster'), 13, 0.01, 'blaster at 2m');
  approx(h.hit(far, 10, 'blaster'), 6, 0.01, 'blaster at 30m');
  approx(h.hit(far, 10, 'blast'), 10, 0.01, 'explosions ignore distance');
});

test('Tanky ants take 1.6x sniper damage', async (g, h) => {
  await h.fresh();
  g.player.pos.set(0, 0, 0);
  const soldier = h.spawn('soldier', 14, 0), jumper = h.spawn('jumper', 0, 14);
  soldier.hp = jumper.hp = 1e4;
  const ratio = h.hit(soldier, 10, 'sniper') / h.hit(jumper, 10, 'sniper');
  approx(ratio, g.TANKY_SNIPER_MULT, 0.001, 'soldier / normal ant');
});

test('Queens take 100% blaster damage on waves 5-10, 66% on 15-20, 33% on 25-30', async (g) => {
  same([5, 10, 15, 20, 25, 30].map(g.queenBlasterMult), [1, 1, 0.66, 0.66, 0.33, 0.33]);
});

test('Sun Laser burns through up to 3 ants in a line', async (g, h) => {
  await h.fresh();
  g.player.pos.set(-20, 0, 26); g.player.yaw = -Math.PI / 2; g.player.pitch = 0;
  await h.sleep(150);
  const line = [0, 1, 2, 3].map(i => h.spawn('titan', -15 + i * 3, 26));
  const hp0 = line.map(a => a.hp);
  for (let i = 0; i < 5; i++) {
    for (const a of line) { a.speed = 0; a.root.position.y = 1.5; }
    g.laserTick(0.1);
    await h.sleep(16);
  }
  const dealt = line.map((a, i) => hp0[i] - a.hp);
  assert(dealt[0] > 0 && dealt[1] > 0 && dealt[2] > 0, `first three should burn, got ${dealt}`);
  approx(dealt[3], 0, 1e-9, 'fourth ant');
});

test('Empty weapons reload automatically', async (g, h) => {
  await h.fresh();
  g.player.ammo.blaster = 0;
  await h.game(0.15);
  assert(g.player.reloading > 0, 'reload did not start');
});

// ---------- ants ----------

test('Termites are immune to land mines but not to pinecone blasts', async (g, h) => {
  await h.fresh();
  const ts = h.spawn('termiteSoldier', 10, 10);
  approx(h.hit(ts, 20, 'mine'), 0, 1e-9, 'mine damage');
  assert(h.hit(ts, 20, 'blast') > 0, 'pinecone blast should still hurt');
});

test('Termites eat land mines before they explode', async (g, h) => {
  await h.fresh();
  g.up.mine = 1; g.player.mines = 3; g.player.mineCd = 0;
  g.player.pos.set(-20, 0, 26); g.player.yaw = 0;
  g.plantMine();
  same(g.mines.length, 1, 'mines after planting');
  const m = g.mines[0].m.position;
  const termite = h.spawn('termite', m.x, m.z);
  termite.speed = 0;
  await h.game(1.3);
  same(g.mines.length, 0, 'mines after termite');
});

test('Pharaoh ant splits into 2 when killed', async (g, h) => {
  await h.fresh();
  const p = h.spawn('pharaoh', 10, 10);
  g.killAnt(p);
  same(g.ants().filter(a => a.alive && a.type === 'pharaoh').length, 2);
});

test('Bullet ant sting makes you bleed 2 HP every second', async (g, h) => {
  await h.fresh();
  g.player.hp = 100;
  g.startBleed();
  await h.game(2.3);
  approx(100 - g.player.hp, 2 * g.BLEED_DMG, 0.01, 'HP lost after ~2s');
  assert(g.player.bleed > 0 && g.player.bleed < g.BLEED_TIME, 'bleed timer should be counting down');
});

test('Static Zapper stops a charging Soldier', async (g, h) => {
  await h.fresh();
  g.player.pos.set(-20, 0, 26);
  const so = h.spawn('soldier', -13, 26);
  so.chargeCd = 0;
  await h.until(() => so.chargeT > 0, 6000, 'soldier never charged');
  g.damageAnt(so, 0.1, { kind: 'shock' });
  same([so.windT, so.chargeT], [0, 0], 'charge state after zap');
});

test('Golden ants only appear every 3 waves up to wave 15', async (g) => {
  same([3, 6, 9, 12, 15, 18, 21, 30].map(g.goldenWave), [true, true, true, true, true, false, false, false]);
});

test('Sugar per ant drops 2.5% per wave after 10 and 4% per wave after 20', async (g) => {
  const got = [10, 15, 20, 25, 30].map(n => +g.lateSugarMult(n).toFixed(4));
  same(got, [1, 0.875, 0.75, 0.55, 0.35]);
});

// ---------- movement ----------

test('Jumping costs stamina and has a 1 second cooldown after landing', async (g, h) => {
  await h.fresh();
  const P = g.player, S = g.state;
  P.pos.set(-20, 0, 26);
  g.keys.Space = true;
  try {
    await h.game(0.1);
    approx(P.stamina, 100 - g.JUMP_STAMINA, 0.5, 'stamina after jump');
    await h.until(() => P.onGround, 6000, 'never landed');
    const landed = S.time;
    await h.until(() => !P.onGround, 6000, 'never jumped again');
    assert(S.time - landed >= g.JUMP_CD - 0.05, `jumped again after ${(S.time - landed).toFixed(2)}s`);
  } finally { g.keys.Space = false; }
});

test('Ants cannot bite or climb on you during a stomp jump', async (g, h) => {
  await h.fresh();
  const P = g.player;
  P.pos.set(-20, 0, 26); P.hp = 100;
  const sa0 = g.sa().length;
  g.keys.Space = true; await h.game(0.03); g.keys.Space = false;
  h.spawn('soldier', -20.3, 26); h.spawn('worker', -19.7, 26); h.spawn('worker', -20, 26.4);
  await h.game(1.2);
  same(g.sa().length, sa0, 'ants on screen');
  approx(P.hp, 100, 1e-9, 'HP');
});
