# Ant Annihilator

A 3D first-person ant defense game that runs in the browser. Defend your backyard from 30 waves of ants, termites and queens with weapons, land mines and traps.

The whole game is a single HTML file built with [Three.js](https://threejs.org/). There is nothing to install or build.

## Play

Open `dist/index.html` in a modern browser (Chrome, Edge, Firefox or Safari) and click to start. The game loads Three.js from the jsDelivr CDN, so you need an internet connection.

Some browsers limit pages opened straight from disk. If the game doesn't start, serve the folder with any static file server, for example:

```bash
python3 -m http.server
```

Then open `/dist/index.html` on the address it prints.

To publish it, upload `dist/index.html` to any static host, such as GitHub Pages, Netlify or itch.io.

## Controls

| Key | Action |
|---|---|
| Mouse | Look and aim |
| Left click | Fire |
| Right click | Shoe smack |
| 1 - 7 / mouse wheel | Switch weapon |
| W A S D | Move |
| Shift | Sprint (uses stamina) |
| Space | Jump and stomp (uses stamina) |
| R | Reload |
| G | Plant a land mine |
| T | Place an ant trap next to a nest |
| F | Slap ants off your screen |
| Esc | Pause |
| Enter | Start the next wave from the shop |

## Gameplay

- **30 waves.** Queens show up on waves 5, 10, 15, 20, 25 and 30, and wave 30 is a final wave with four queens. Kill the last queen and the colony gets enraged.
- **Sugar and the shop.** Ants drop sugar. Spend it between waves on weapons, upgrades, gadgets and gear.
- **Weapons.** Bug Blaster, Bug Spray, Stinger Sniper, Sun Laser, Gumball Gatling, Pinecone Launcher and Static Zapper. Most weapons hit harder up close; the Sniper is the opposite and hits hardest from far away.
- **Gadgets.** Land mines go off 4 seconds after you plant them. Sticky ant traps slow and hurt ants coming out of a nest.
- **Movement.** Sprinting and jumping use stamina, and sprint-jumping is the fastest way to get around. Landing on ants stomps them, and ants can't climb on you during a stomp jump.
- **Ant Library.** Every species you meet is saved in the library with its stats and abilities.

### Ants

Black Garden Ant, Fire Ant, Sugar Ant, Green Weaver Ant (spins slowing webs), Carpenter Ant (chews through traps), Army Ant, Soldier Ant (charges), Bullet Ant (makes you bleed), Ghost Ant, Pharaoh Ant (splits when killed), Termite, Jumper Ant, Termite Soldier (gums up your gun), Titan Ant, Flying Termite, Trap-Jaw Ant, Acid Ant, Rubber Ant, Leafcutter Ant, Nurse Ant, Exploding Ant, Golden Ant (a runaway sugar bonus) and the Queen.

Termites are immune to land mines and eat them. Tanky ants take extra damage from the Sniper.

## Tests

The tests play the real game in a browser and check weapons, damage rules, ant abilities, movement and wave economy.

**In your browser:** serve the repo folder (see above) and open `/tests/index.html`. Results show on the page.

**From the command line** (Python 3.9+):

```bash
pip install -r tests/requirements.txt
python -m playwright install chromium
python tests/run_tests.py
```

The script starts its own temporary server, runs every test in headless Chromium and exits with an error if any test fails. The GitHub Actions workflow in `.github/workflows/tests.yml` runs the same command on every push and pull request.

The tests load a copy of `dist/index.html` with a small hook attached, so the game file itself contains no test code.

## Project layout

```
dist/index.html          the game
tests/index.html         browser test runner
tests/game-tests.js      the test cases
tests/run_tests.py       headless runner for the command line and CI
tests/requirements.txt   Python dependency for the headless runner
.github/workflows/       GitHub Actions workflow that runs the tests
```
