# Contest electronics mini-game — problem statement and phased roadmap

**Purpose:** Single reference for *what* you are building (beyond the current template), *how* it maps to this repo, and *in what order* to implement it. Phase 1 matches the prototyping track described in [`.cursor/plans/contest_riddle_mini-game_f1d62d16.plan.md`](../.cursor/plans/contest_riddle_mini-game_f1d62d16.plan.md) (currently **on hold**).

**Companion docs:** [GAME_ARCHITECTURE.md](./GAME_ARCHITECTURE.md) (current engine layout).

**Last updated:** 2026-04-06

---

## 1. Vision in one paragraph

The player explores a **top-down map** with **no NPCs and no combat**. Many **stations** can be interacted with (**E**), but only a **subset is active** at any time—eventually chosen by a **backend**; for now **mock data** mimics that contract. Active stations show a **riddle**; the player types an answer (typically an **electronics component name**). Answers are **validated only via a POST**-shaped call: the server (or mock) returns **correct/incorrect only**, **never the answer text**. On success, the player **earns a component** represented as a **tile or sprite** in the game. Components live in an **inventory**; the player can **place** them on the map and **interact** with placed parts (e.g. **cycle resistance**, **toggle a switch**) to build a **target circuit**. **Winning** occurs when the **combination and parameterization** of placed components matches the **goal circuit** (validated similarly via backend/mock, not by trusting the client alone in production).

---

## 2. Problem statement (structured)

### 2.1 Core loop

1. **Explore** — Walk the map (grid movement, existing [`GameScene`](src/game/scenes/GameScene.js) + grid-engine).
2. **Discover** — See many interactable markers; only **active** ones respond (visual distinction: dimmed vs glowing, or hidden prompt until active).
3. **Solve** — **E** opens UI: riddle text + text field → **submit** triggers **POST /validate-answer** (mocked) → feedback only (`ok` / `wrong`), no answer leak.
4. **Collect** — Correct solve grants a **component instance** (type: resistor, capacitor, …) into **inventory**.
5. **Build** — From inventory, enter **place mode** (or drag/select slot) and put components on **valid cells** (breadboard / snap grid / dedicated layer—TBD per design).
6. **Tune** — **E** on a **placed** component opens **component-specific** interaction: e.g. resistor cycles Ω values; switch toggles open/closed; LED brightness tied to solved sub-state—**design-dependent**.
7. **Win** — When the **circuit state** (topology + parameters) satisfies the **goal**, trigger victory (POST /validate-circuit or mock).

### 2.2 Non-goals (for this product)

- NPC dialogue trees, shop economy, combat, enemy AI, health/coins as primary mechanics (existing systems may remain in code but should be **disabled or removed** from the contest build).
- Teaching a full SPICE engine inside the browser (unless you explicitly choose that later); early phases can use **discrete state** and **rule checks** instead of analog simulation.

### 2.3 Backend principles (even while mocked)

| Principle | Meaning |
|-----------|---------|
| **Authoritative activation** | Which station ids are active, and their riddle payload, come from API/mock—not hardcoded per build for production. |
| **No answer in responses** | Validation endpoints return e.g. `{ "valid": true }` or `{ "valid": false, "hintLevel": 0 }`—never `expectedAnswer`. |
| **Authoritative win** | Final circuit validation should be server-side in production; client can preview “looks connected” UX only. |
| **Mock parity** | Mock layer implements the **same request/response shapes** as the real API so swapping URLs is trivial. |

---

## 3. How this maps to the current codebase

| Today | Your target |
|-------|-------------|
| [`GameScene.js`](src/game/scenes/GameScene.js) — hero, NPCs, enemies, items, teleports, bush/box combat | Slim **contest scene** (or feature flags): movement + interactables + placed components only |
| [`App.js`](src/App.js) — `CustomEvent` bridge, `DialogBox`, menus, health/coins | Add **riddle modal**, **inventory UI**, optional **placement HUD**; hide or remove health/coin for contest |
| Tiled `actions` layer — `dialog`, `npcData`, `enemyData`, `itemData`, `teleportTo` | New/standardized properties: e.g. `stationId` (string), optional `placeSlot` layer for build grid |
| Static `dialogs` object in `App.js` | Replaced or supplemented by **payload from mock/API** per active station |
| grid-engine | Keep for **player**; **NPC/enemy** registration can be dropped. **Placed components** might be **sprites snapped to grid** without grid-engine characters, or static bodies—phase decision |

**Persistence today:** `heroStatus` passed through `scene.restart` for teleports. You will need a **contest state bag** (inventory, placed entities, solved station ids, component parameters) carried the same way **or** centralized in React and synced via events—pick one pattern in Phase 3 and stay consistent.

---

## 4. Phased roadmap (super detailed)

Each phase lists **goals**, **deliverables**, **code touchpoints**, **data/API contracts**, **acceptance criteria**, and **dependencies**. Later phases assume earlier ones are done (or stubbed).

---

### Phase 0 — Map authoring and contest layout baseline

**Goals**

- Establish **your** map geometry, collision, and visual identity in Tiled without yet wiring full game logic.
- Define naming conventions for layers and object properties so Phaser code stays stable as art changes.

**Deliverables**

- One or more Tiled maps (JSON) under [`src/game/assets/sprites/maps/`](src/game/assets/sprites/maps/) imported in [`BootScene.js`](src/game/scenes/BootScene.js).
- Documented conventions (in this file or a short `docs/TILED_CONTEST.md` later):
  - **Collision / walkable:** align with grid-engine expectations (tile properties such as `ge_collide` as today).
  - **Station markers:** objects on `actions` with stable **`stationId`** (string, unique per physical kiosk).
  - Optional: a **placement layer** or object grid for “where components may be dropped” (even if unused until Phase 4).

**Code touchpoints**

- [`BootScene.js`](src/game/scenes/BootScene.js) — preload new map keys.
- [`MainMenuScene.js`](src/game/scenes/MainMenuScene.js) — `mapKey` for contest entry.

**API / mock**

- None.

**Acceptance criteria**

- Game loads your map; player can walk bounds you expect; no dependency on riddles yet.

**Dependencies**

- None (can parallelize with Phase 1).

---

### Phase 1 — Prototyping: move, E to interact, riddle UI, local/mock validation shape

**Status:** Described in detail in the **on-hold** plan [contest_riddle_mini-game_f1d62d16.plan.md](../.cursor/plans/contest_riddle_mini-game_f1d62d16.plan.md). Treat that document as the **implementation checklist** for this phase; this spec only **reframes** it in the larger product.

**Goals**

- Prove the **React overlay + Phaser freeze** loop for **one** riddle station.
- **E** (and optionally Enter) triggers interaction when overlapping a hotspot.
- Popup: **prompt + optional text input**; grading calls a function shaped like **`POST /stations/:id/answer`** but implemented as **mock** returning `{ valid: boolean }` only.

**Deliverables**

- `open-riddle` / `riddle-ui-closed` (or equivalent) events documented in [GAME_ARCHITECTURE.md](./GAME_ARCHITECTURE.md).
- `RiddlePopup` (or extended `DialogBox`) in React.
- `GameScene` branch for Tiled property (e.g. `riddleId` or prefer **`stationId`** early to match Phase 2 naming).

**Code touchpoints**

- [`GameScene.js`](src/game/scenes/GameScene.js), [`App.js`](src/App.js), new `src/game/RiddlePopup.js`, optional `src/game/api/mockContestApi.js`.

**API contract (mock = same shape as future backend)**

```http
POST /api/stations/:stationId/answer
Content-Type: application/json

{ "answer": "string from user input" }
```

```json
200 OK
{ "valid": true }
```

or

```json
200 OK
{ "valid": false }
```

(No `correctAnswer`, `expected`, or full solution.)

**Acceptance criteria**

- At least one station: wrong answer shows failure; correct shows success and closes modal; movement blocked while open.

**Dependencies**

- Phase 0 map with at least one `stationId` object (or temporary `riddleId` alias you rename in Phase 2).

**Note:** Phase 1 **prototype** may still use a **local manifest** for prompt text for speed; Phase 2 moves prompts to **mock “session config”** from API.

---

### Phase 2 — Mock backend: active stations + question payload + POST-only validation

**Goals**

- **Central mock** (replace scattered JSON) that answers:
  - Which **`stationId`s are active** for this “session”?
  - For each active station: **riddle text** (and metadata: title, optional difficulty)—**not** the answer.
- Client **never** embeds correct answers for production path; mock module may hold them **only** to simulate server validation (clearly separated file, e.g. `mockServerState.js` not shipped in a secure build—or behind env flag).

**Deliverables**

- **`GET /api/session` or `GET /api/stations/active`** mock returning:

```json
{
  "activeStationIds": ["station_a", "station_c"],
  "stations": {
    "station_a": { "prompt": "...", "title": "Riddle A" }
  }
}
```

- Phaser: on scene load (or interval), **fetch mock**; build a **`Set` of active ids**; **disable** interaction UI for inactive (optional: show inactive art).
- Answer flow: **only** `POST .../answer` as in Phase 1.

**Code touchpoints**

- New `src/game/api/contestApi.js` — `fetchActiveStations()`, `submitAnswer(stationId, answer)` wrapping `fetch` or `axios`.
- `GameScene` — filter overlaps: if `!activeSet.has(stationId)`, no open modal (or show “offline” toast).
- `App.js` — optionally show global “session loaded” debug in dev.

**Acceptance criteria**

- Changing mock data **without** editing Tiled changes which kiosks work and what text appears.
- Network tab (or mock interceptor) shows **no answer** in GET responses.

**Dependencies**

- Phase 1 event + UI shell.

---

### Phase 3 — Rewards: component tiles + inventory (data + UI)

**Goals**

- On **`valid: true`** from answer POST, grant a **component reward** (e.g. `type: "resistor"`, `instanceId: uuid`, default `state` for params).
- Represent the reward **in-game** as a **tile/sprite** (reuse tileset or small atlas per component family).
- **Inventory** model: ordered list of instances; **React HUD** (icons + count or list); sync with Phaser via events.

**Deliverables**

- **Component taxonomy** (versioned enum): `resistor | capacitor | switch | led | wire | ...` aligned with your art.
- **Instance record:** `{ instanceId, type, variant?, params? }` (params filled in Phase 5).
- Events e.g. `inventory-updated` with `{ items: [...] }` from Phaser → React, or inventory owned in React and Phaser requests “consume for place”—choose **single source of truth** (recommended: **React** for inventory list, Phaser for world entities, sync on place/pickup).

**Code touchpoints**

- [`BootScene.js`](src/game/scenes/BootScene.js) — preload component sprites/tiles.
- New `src/game/inventory/` or `src/game/components/types.js`.
- New `InventoryBar.js` (React) in [`App.js`](src/App.js).
- Extend answer success handler to **append** reward (from POST response body, still **no answer**):

```json
{ "valid": true, "reward": { "type": "resistor", "instanceId": "..." } }
```

(Mock returns reward; real backend returns same shape.)

**Acceptance criteria**

- Solving a station adds a visible slot in inventory; reloading scene does not duplicate if you persist `heroStatus`/React state (define persistence in Phase 4 or localStorage stub).

**Dependencies**

- Phase 2 POST response extended with optional `reward` when valid.

---

### Phase 4 — Placement: put components on the map

**Goals**

- Player selects an **inventory slot**, enters **place mode** (cursor ghost), confirms on a **valid cell**; Phaser spawns a **placed entity** snapped to grid.
- **Rules:** no overlap on blocked tiles; max count per cell = 1 (or allow stack rules—document choice).
- **Persistence:** placed entities included in `scene.restart` / save blob so teleports do not wipe the build (mirror how `heroStatus` is passed today).

**Deliverables**

- Input flow: keybinding to open inventory focus, select item, **place** / **cancel**.
- Placed object registry: `Map<cellKey, PlacedComponent>` or array with `{ x, y, instanceId, type, params }`.
- Tiled: optional **placement mask** (object layer or tile property `place_allowed`).

**Code touchpoints**

- [`GameScene.js`](src/game/scenes/GameScene.js) — placement preview, confirm, spawn sprite/group.
- [`utils.js`](src/game/utils.js) — snap world XY to grid (16px consistent with current map).
- React: highlight selected inventory item.

**API / mock**

- Optional: `POST /api/placements` for audit—**not required** for offline contest MVP.

**Acceptance criteria**

- Place and see component on map; walk around; cannot place inside walls; picking **up** (if in scope) or **moving** can be Phase 4 stretch or Phase 5.

**Dependencies**

- Phase 3 inventory + art.

---

### Phase 5 — Placed-component interaction (parameters and toggles)

**Goals**

- **E** on a **placed** component (not a station) opens a **small modal** or **in-world widget** to change **local state**:
  - Resistor: cycle **R** through `{ 100, 1k, 10k }` (example).
  - Switch: **boolean** on/off.
  - Capacitor: discrete **C** values or “charged / discharged” if you keep it pedagogical not analog.
- State changes fire events so React debug panel or Phaser can show current **circuit snapshot**.

**Deliverables**

- **Strategy table** per `type`: `onInteract(placedEntity)` dispatch.
- **Snapshot structure** (for Phase 6), e.g.:

```json
{
  "nodes": [...],
  "edges": [...],
  "params": { "instanceId": { "rOhms": 1000, "closed": true } }
}
```

(Exact schema depends on whether you model **graph** or **slot puzzle**.)

**Code touchpoints**

- [`GameScene.js`](src/game/scenes/GameScene.js) — second overlap channel: `placedComponentsGroup` vs `station` triggers.
- New React `ComponentTuneModal.js` or lightweight Phaser-only UI.

**Acceptance criteria**

- Each component type you ship in Phase 3 has defined behavior; unknown type no-ops safely.

**Dependencies**

- Phase 4 placed entities.

---

### Phase 6 — Circuit goal and win condition (mock → API)

**Goals**

- Define a **target circuit** (logical): required components, connections, and parameter windows.
- **Validate** with **`POST /api/circuit/validate`** returning `{ "complete": true }` or `{ "complete": false }` plus optional **non-spoiler** hints (`"missingPower"`, `"wrongTopology"`).
- **Win UX:** React overlay or `VictoryScene`; lock further edits or show “reset puzzle”.

**Deliverables**

- **Snapshot builder** from placed entities + adjacency (e.g. 4-neighbor on grid if “wire” connects cells, or explicit wire items between pins—**design choice** documented here when you pick it).
- Mock validator that encodes **one** contest puzzle for demo day.

**Code touchpoints**

- New `src/game/circuit/buildSnapshot.js`, `src/game/circuit/mockValidate.js`.
- `GameScene` — “Check circuit” button or automatic check on each state change (debounced).

**API contract (illustrative)**

```http
POST /api/circuit/validate
{ "snapshot": { ... } }
```

```json
{ "complete": true }
```

**Acceptance criteria**

- Intentionally wrong build → not complete; correct build → win; **no** leaked solution details in response.

**Dependencies**

- Phase 5 snapshot.

---

### Phase 7 — Real backend integration and hardening

**Goals**

- Swap `mockContestApi` base URL to production; env-based config.
- **Auth/session** if contest requires per-team tokens (optional).
- **Rate limiting / logging** on server; client handles offline errors gracefully.

**Deliverables**

- `.env` / `REACT_APP_CONTEST_API_URL`.
- Error states in UI (station fetch failed, validation timeout).

**Acceptance criteria**

- Same client build talks to mock or real server with only config change.

**Dependencies**

- Phases 2–6 contracts stabilized.

---

### Cross-cutting track — Remove NPCs, enemies, and combat from contest build

**Goals**

- Smaller bundle path and fewer accidental interactions during the event.

**Deliverables**

- Either **fork** `GameScene` into `ContestGameScene` registered in [`App.js`](src/App.js), or **`GAME_MODE === 'contest'`** guards skipping:
  - `npcData`, `enemyData`, sword/push item dialogs, bush/box combat overlaps, `takeDamage` / `GameOverScene` triggers.
- Hide [`HeroHealth`](src/game/HeroHealth.js) / [`HeroCoin`](src/game/HeroCoin.js) from [`App.js`](src/App.js) when in contest mode.

**When to schedule**

- Can start **after Phase 1** or in **parallel** with Phase 2; must finish before public demo to avoid confusion.

**Acceptance criteria**

- Playtest: no damage, no random NPCs blocking stations; teleports still work if your map uses them.

---

## 5. Open design decisions (resolve before Phase 4–6 coding)

Record your choices here as you decide:

1. **Connection model:** implicit adjacency on grid vs explicit wire component vs node graph editor.
2. **Single breadboard scene vs multi-room map** with carried inventory.
3. **Inventory capacity** and whether **duplicate** component types allowed from multiple riddles.
4. **Win per session** vs persistent leaderboard (out of scope unless added in Phase 7).

---

## 6. Suggested timeline mental model

| Phase | Rough focus |
|-------|-------------|
| 0 | Your map in Tiled + preload |
| 1 | Feel of interact + riddle + mock POST |
| 2 | Dynamic active stations = “backend shape” |
| 3 | Inventory + component art |
| 4 | Placement |
| 5 | Tune placed parts |
| 6 | Circuit validate + win |
| 7 | Wire real API |

Phases 3–5 are the **largest** unknowns because they depend on **how literally** you simulate electronics vs a **puzzle abstraction**.

---

## 7. Changelog (this document)

| Date | Change |
|------|--------|
| 2026-04-06 | Initial phased spec from full problem statement; Phase 1 cross-linked to on-hold implementation plan. |

Add a row whenever you change phase scope or API contracts.
