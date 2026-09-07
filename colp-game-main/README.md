# 🎮 COLP — 3D Arcade Whack-a-Mole

**Project Location:** `C:\Users\Aluno Santos Tech\Downloads\Colp\Colp\colp-game`
**Engine:** PlayCanvas (WebGL/WebGPU) via local build at `engine-main/`
**Dev Server:** Vite 5 on `http://localhost:3000`
**Language:** JavaScript (ES Modules)

---

## 📁 Project Structure

```
colp-game/
├── index.html                   # Main HTML entry — UI overlay, screens, HUD
├── vite.config.js               # Vite config — aliases PlayCanvas to local build
├── package.json                 # Node dependencies
├── README.md                    # This file
├── src/
│   ├── main.js                  # App bootstrap — initializes all subsystems
│   ├── styles.css               # All UI styling (glassmorphism, HUD, animations)
│   ├── scene-setup.js           # 3D scene: camera, lighting, Machine.glb loader
│   ├── mascot-manager.js        # 5 mascots pop-up/down logic, powerups/powerdowns
│   ├── hammer-controller.js     # Hammer follows cursor, 3D strike animation
│   ├── audio-manager.js         # Web Audio API: knock_1..5.wav
│   ├── vfx-manager.js           # 2D canvas VFX: hit animations, floaters, camera shake
│   ├── game-state.js            # Game logic: 30s timer, scoring, 6x combo multiplier
│   ├── ui-controller.js         # Screen transitions, HUD updates, leaderboard render
│   └── supabase-client.js       # Highscores: localStorage + Supabase REST integration
└── public/
    ├── models/
    │   ├── Machine.glb          # MODIFIED: pCube5 split into 4 color primitives (C/O/L/P)
    │   ├── Mascot1.glb          # Orange mascot (hole 0)
    │   ├── Mascot2.glb          # Green mascot  (hole 1)
    │   ├── Mascot3.glb          # Red mascot    (hole 2)
    │   ├── Mascot4.glb          # Purple mascot (hole 3)
    │   ├── Mascot5.glb          # Pink mascot   (hole 4)
    │   ├── Hammer.glb           # Player hammer
    │   └── Hammerin.glb         # Reserved (not yet used)
    ├── textures/
    │   ├── bg.png               # Background image (static blue-door scene)
    │   ├── Powerup.png          # +15s time bonus item icon
    │   └── Powerdown.png        # -15s time penalty item icon
    ├── sounds/
    │   ├── knock_1.wav
    │   ├── knock_2.wav
    │   ├── knock_3.wav
    │   ├── knock_4.wav
    │   └── knock_5.wav
    └── vfx/
        ├── knock_1/ .. knock_6/ # Transparent PNG frame sequences for hit VFX
        └── meta.json            # Frame count, fps per sequence
```

---

## 🎮 Game Design & Mechanics

### Core Loop
1. Player enters a **nickname** on the main menu
2. Presses **PLAY** → 30-second countdown begins
3. **5 mascots** randomly pop up from holes in the 3D machine
4. Player clicks on them with the **left mouse button** (hammer strikes)
5. **Scoring**: Base 7pts per hit multiplied by combo multiplier
6. When 30s ends → **Game Over** screen with stats and highscore

### Scoring System

| Event | Effect |
|-------|--------|
| Mascot hit | +7 pts × current combo |
| Combo chain | Multiplier rises: 1x → 2x → 3x → 4x → 5x → 6x (max) |
| Combo decay | No hit for 2.0s resets combo to 1x |
| Powerup (star icon) | +15 seconds added to timer |
| Powerdown (X icon) | -15 seconds removed from timer |

### Mascot Behavior
- Pop-up duration: **1.0 seconds**
- Spawn interval: **0.75s – 1.85s** (random)
- Rise animation: **0.18s** (sine ease-in)
- Sink animation: **0.22s** (quadratic ease-out)
- Hit animation: **0.22s** (squash + rapid exit)
- Powerup chance: **14%**
- Powerdown chance: **14%** (exclusive)
- Color shuffle: **15% chance** each spawn cycle

### Hole Positions
> Local offsets from GameWorld. GameWorld itself is offset (-0.092, -0.070, 0.001) from world origin.

| Mascot | Color | x | baseZ | peakY | hideY |
|--------|-------|-------|-------|-------|-------|
| 0 | Orange | 0.054 | 0.046 | 0.053 | -0.04 |
| 1 | Green | 0.016 | 0.065 | 0.057 | -0.04 |
| 2 | Red | 0.012 | 0.002 | 0.081 | -0.02 |
| 3 | Purple | -0.001 | -0.061 | 0.026 | -0.07 |
| 4 | Pink | 0.055 | -0.168 | 0.056 | -0.04 |

---

## 🏗️ Technical Architecture

### PlayCanvas Setup
PlayCanvas is loaded from a **local build** of the engine repo — NOT from npm.

- Engine repo: `C:\Users\Aluno Santos Tech\Downloads\engine-main`
- Build output: `engine-main/build/playcanvas.mjs`
- Aliased in vite.config.js:

```js
resolve: {
  alias: {
    'playcanvas': path.resolve(__dirname, '../../engine-main/build/playcanvas.mjs')
  }
}
```

To rebuild the engine after changes:
```powershell
cd "C:\Users\Aluno Santos Tech\Downloads\engine-main"
$env:PATH = "C:\Program Files\nodejs;" + $env:PATH
npm run build
```

### Camera Setup

```
Camera Position:  (0.48, 0.17, 0.0)
Camera LookAt:    (0.04, 0.07, 0.0)
FOV:              34 degrees
Near/Far:         0.05 / 100
```

The camera is placed on the **+X side** and looks along **-X** to see the machine front face directly — matching the Maya "persp" viewport reference.

### Machine.glb — COLP Letter Colors

The original GLB had a single white mesh (`pCube5`). A Node.js script split it into 4 index-buffer primitives, each with a named material:

| Letter | Material | RGB (linear) | Description |
|--------|----------|--------------|-------------|
| C | `Letter_C` | (0.88, 0.66, 0.60) | Peach / Coral Pink |
| O | `Letter_O` | (0.82, 0.66, 0.85) | Lavender / Pastel Purple |
| L | `Letter_L` | (0.83, 0.85, 0.74) | Pale Olive / Sage Khaki |
| P | `Letter_P` | (0.56, 0.58, 0.60) | Cool Slate Gray |

Split by Z-axis vertex range in local model space:
- **C** → Z >= 0.050
- **O** → 0.028 <= Z < 0.050
- **L** → -0.005 <= Z < 0.028
- **P** → Z < -0.005

> The modified Machine.glb is already in `public/models/`. Original (white) GLB is in `game_fbx/`.

### Hammer Controller

Internal Maya export offset in Hammer.glb: `(+0.1763, +0.0856, -0.0495)`
Compensation offset applied on child entity: `(-0.1763, -0.0856, 0.0495)` (exact alignment to cursor)
Scale: 1.6x. Rest rotation: `(15, -75, -25)` degrees.

### VFX System
A 2D `<canvas>` at z-index 3 renders hit effects in screen space:
- PNG frame sequences from `public/vfx/knock_N/` (transparent background)
- Floating score text that rises and fades over 0.9s
- Camera shake via CSS transform offset for 300ms

### Audio
Web Audio API (no lib). Random knock_N.wav + random pitch via `playbackRate`.

### Highscores / Leaderboard
- Always persists to **localStorage** (key: `colp_highscores`, top 10)
- Optional **Supabase** REST integration via `.env`:
  ```
  VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
  VITE_SUPABASE_ANON_KEY=your_anon_key
  ```

---

## 🖥️ UI Screens

### Menu Screen
- NICKNAME input (max 15 chars)
- PLAY button (starts 30s game)
- HIGHSCORES button (opens leaderboard modal)

### HUD (in-game)
| Element | Position | Notes |
|---------|----------|-------|
| Timer | Top Left | Red pulse animation when < 5s |
| Score | Top Center | Updates live |
| Combo Boost | **Top Right** | Hidden by default; appears with neon glow **only on mascot hit** |
| Player Tag | Bottom Left | Nickname + green online dot |
| Mouse Icon Hint | Bottom Right | SVG left-click icon + "to whack" |

### Game Over Screen
- Final Score / Mascots Whacked / Max Combo / Best Record
- "NEW RECORD!" animated badge on personal best
- PLAY AGAIN and MAIN MENU buttons

---

## 🔧 Running the Game

```powershell
# Start dev server (run from any directory)
$env:PATH = "C:\Program Files\nodejs;" + $env:PATH
& "C:\Program Files\nodejs\node.exe" -e "
const {spawn} = require('child_process');
spawn('cmd.exe', ['/c', 'npx', 'vite', '--host', '0.0.0.0', '--port', '3000'], {
  cwd: 'C:/Users/Aluno Santos Tech/Downloads/Colp/Colp/colp-game',
  stdio: 'inherit'
});
"
```

Then open: **http://localhost:3000**

---

## 🛠️ Code Generator Script

All files in `colp-game/src/` and `index.html` are managed by:

```
C:\Users\Aluno Santos Tech\Downloads\engine-main\setup-colp.mjs
```

Run to apply latest changes:
```powershell
cd "C:\Users\Aluno Santos Tech\Downloads\engine-main"
& "C:\Program Files\nodejs\node.exe" setup-colp.mjs
```

This is the **single source of truth** for rebuilding the game source files.

---

## 📝 Known Issues

- [ ] **Hit detection** uses pixel-radius screen-space math, not true 3D raycasting. May miss near edges.
- [ ] **Hammerin.glb** is present but not wired up — intended for a separate swing animation.
- [ ] **Powerup billboards** face camera with a static rotation, not true billboarding.

---

## 🚀 Planned Features (from Prompt_4_Colp.txt)

- [ ] Multiple difficulty rounds (increasing mascot speed each round)
- [ ] Mascot idle/hit animations
- [ ] Full online leaderboard via Supabase
- [ ] Touch/mobile support
- [ ] Settings screen (volume, quality)
- [ ] Animated tutorial overlay

---

## 📂 Original Source Assets

Located at: `C:\Users\Aluno Santos Tech\Downloads\Colp\Colp\game_fbx\`

| File | Description |
|------|-------------|
| Machine.fbx | Arcade machine with COLP 3D letters |
| Mascot1..5.fbx | 5 animal character models |
| Hammer.fbx | Player hammer |
| Hammerin.fbx | Alternate hammer (unused) |
| knock_1..6.gif | VFX hit animation GIF sequences |

Converted to GLB using the `fbx2gltf` CLI tool.
GIFs were processed into transparent PNG frame sequences using frame extraction + background removal.

---

## 📄 Full Game Specification

```
C:\Users\Aluno Santos Tech\Downloads\Colp\Colp\Prompt_4_Colp.txt
```

---

## 🤖 Context for New AI Session

When starting a new conversation with an AI agent to continue this project, include:

1. This **README.md** as context
2. The **Prompt_4_Colp.txt** for design intent
3. State these key facts:
   - PlayCanvas is a **local build**, NOT from npm
   - Direct file writes to `colp-game/` **may be restricted** — use `setup-colp.mjs` + Node.js
   - PowerShell Node path: `$env:PATH = "C:\Program Files\nodejs;" + $env:PATH`
   - Vite dev server runs on port **3000** as background daemon
   - Camera is on **+X axis** looking toward **-X** (not the typical -Z forward view)
   - Machine world offset: **(-0.092, -0.070, 0.001)**

---

*Generated: 2026-08-29 | Colp Game v0.1-alpha*
