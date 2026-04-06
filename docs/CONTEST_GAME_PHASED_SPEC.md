# Contest electronics mini-game — problem statement and phased roadmap

**Purpose:** Single reference for *what* you are building (beyond the current template), *how* it maps to this repo, and *in what order* to implement it. Phase 1 prototyping overlaps [`.cursor/plans/contest_riddle_mini-game_f1d62d16.plan.md`](../.cursor/plans/contest_riddle_mini-game_f1d62d16.plan.md) — **update that plan** when implementing so event names and endpoints match this doc.

**Companion docs:** [GAME_ARCHITECTURE.md](./GAME_ARCHITECTURE.md) (current engine layout).

**Last updated:** 2026-04-06

---

## 1. Vision in one paragraph

The player explores a **single-level, multi-room** top-down map with **no NPCs and no combat**. At game start they enter an **access code**; a **backend (mocked for now)** returns a **contest configuration**: which **stations** are active, riddle copy, and which **circuit variant** (one of several predefined targets) they must realize. Only **certain map regions** accept **placed components**. Stations are interacted with via **E** and show a riddle; answers are validated with **`POST /validate-answer`** — responses **never include the correct answer**; on success the server returns a **16-character component hash** (authoritative identity for that earned part). The player has an **8-slot stackable inventory**; they **place** parts with **left-click** on valid empty cells and **unplace** with **right-click** (returning to a free slot, stacking duplicates), except for **pre-seeded** parts marked **non-removable**. **E** on a placed part **cycles** its discrete state (e.g. resistance step, switch on/off). A **frontend** check (minimal `if`/`else`, optional RC-style math **left commented** for later) gives immediate feedback; **Q** runs that check manually. When the assembly is complete, the client sends **placed layout + hashes** to the backend **`POST /validate-circuit-final`** (mocked); **only that response** grants **victory**. **localStorage** persists progress across reloads. **Session leaderboards** are **out of scope** for now.

---

## 2. Problem statement (structured)

### 2.1 Core loop

1. **Start** — User enters **access code** → **`POST /contest/bootstrap`** (mock) returns full **contest config** (active stations, prompts, `circuitVariantId`, etc.).
2. **Explore** — Walk between **rooms** on one level ([`GameScene`](src/game/scenes/GameScene.js) + grid-engine); **inventory is global** to the level.
3. **Discover** — Many **`stationId`** markers exist in Tiled; only ids listed in config as **active** open riddles (visual: dim vs active).
4. **Solve** — **E** at station → React riddle UI → **`POST /validate-answer`** → `{ valid, componentHash? }` (16-char hash only if valid; **never** the answer string).
5. **Collect** — Valid answer pushes a stack for that component type into a **random free inventory slot** (1–8); **same-type stacks** in one slot.
6. **Build** — Select slot with **1–8**. **Left-click** a **legal, empty** grid cell in the **placement zone** → place one unit from that slot. **Right-click** a **player-placed** cell → return one unit to inventory (stack). **Locked** pre-placed parts cannot be unplaced.
7. **Tune** — **E** while facing/overlapping a **placed** part (priority below) **cycles** its variant state (resistor value, switch, etc.).
8. **Check** — **Q** runs the **frontend** circuit check for the configured `circuitVariantId` (scaffold with **detailed physics commented out**).
9. **Win** — User triggers final submit (or flow after successful check) → **`POST /validate-circuit-final`** with **assembly + hashes** → server returns victory or not.

### 2.2 Component catalog (v1)

Fixed set of part **types** (art + logic hooks):

| Type id | Role |
|---------|------|
| `resistor` | Cycle discrete R (values TBD in implementation). |
| `capacitor` | Cycle discrete C / state (TBD). |
| `switch` | Toggle on/off (or cycle). |
| `power_source` | Fixed or cycled voltage state (TBD). |
| `wire` | Connection / bridge representation on grid (TBD). |
| `bulb_load` | Load / brightness state driven by simple rules (TBD). |

### 2.3 Non-goals (for this product)

- NPC dialogue trees, shop economy, combat, enemy AI, health/coins as primary mechanics (existing systems may remain in code but should be **disabled or removed** from the contest build).
- Full SPICE / accurate analog simulation in v1 — **minimal boolean/numeric checks** only; elaborate **RC/network math stays commented** until you need it.
- **Leaderboards** and **session analytics** — **ignored for now**.

### 2.4 Backend principles (even while mocked)

| Principle | Meaning |
|-----------|---------|
| **Authoritative config** | Active stations, riddle text, answer grading, component hashes, and circuit variant id come from **bootstrap** + **validate-answer** + **validate-circuit-final** — not from client-trusted static files in production. |
| **No answer leak** | **`POST /validate-answer`** returns at most `valid` + `componentHash` (16 chars). Never `expectedAnswer` or plaintext solution. |
| **Hash as component identity** | The **16-character hash** ties an earned part instance to the server-side definition; final validation receives **hashes + layout** so the server can confirm the assembly. |
| **Authoritative win** | Only **`POST /validate-circuit-final`** confirms victory (mock returns the same shape as future API). |
| **Mock parity** | All endpoints implemented in **`src/game/api/mockContestBackend.js`** (or similar **single module**); production swaps base URL only. |

---

## 3. Resolved design decisions (reference)

These replace the older “open questions” list.

### 3.1 Identifiers: `stationId` (not `riddleId`)

- **Tiled** `actions` objects use custom property **`stationId`** (string, unique per kiosk in the level).
- Riddle **text** and **active flag** come from **bootstrap config** keyed by `stationId`. No separate `riddleId` property.

### 3.2 Temporary API surface (mock; rename later if backend differs)

All paths are **logical** — prefix with `/api` in `fetch` if you prefer (`/api/contest/bootstrap`, etc.).

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | **`/contest/bootstrap`** | Body: `{ "accessCode": string }`. Returns **contest config** (see §3.5). |
| `POST` | **`/validate-answer`** | Body: `{ "stationId": string, "answer": string, "accessCode": string }`. Returns `{ "valid": boolean, "componentHash"?: string }` — when `valid === true`, `componentHash` is exactly **16 characters** (e.g. hex `[0-9a-f]{16}`); adjust if your backend uses another alphabet. |
| `POST` | **`/validate-circuit-final`** | Body: `{ "accessCode": string, "circuitVariantId": string, "assembly": ... }` (see §3.7). Returns `{ "victory": boolean }` (optional non-spoiler `reasonCode` later). |

### 3.3 Contest state bag + persistence

- **Canonical persisted state** lives in **`localStorage`** (one JSON blob, e.g. key `contest_game_state_v1`), updated after: bootstrap success, each answer result, inventory change, place/unplace, variant cycle, room change (if needed).
- **Suggested shape** (implementations may extend):

```json
{
  "accessCode": "",
  "circuitVariantId": "",
  "inventorySlots": [
    { "slotIndex": 0, "stacks": [{ "type": "resistor", "count": 2, "componentHashes": ["..."] }] }
  ],
  "selectedSlotIndex": 0,
  "placed": [
    {
      "gridX": 0,
      "gridY": 0,
      "type": "resistor",
      "variant": { "rOhms": 1000 },
      "componentHash": "16CHARHASHHERE01",
      "locked": false
    }
  ],
  "solvedStationIds": ["station_a"]
}
```

- **`heroStatus`** from Phaser can still carry **position / mapKey** across teleports; **inventory + placed + hashes** should **rehydrate from localStorage** on scene load so **multi-room** does not desync.

### 3.4 Who drives placement vs conflicts

- **React** (or a small **game state module** imported by both) owns **inventory slots, selected index (1–8), and persisted blob**. Phaser reports **pointer → grid cell**, **placement zone hit-test**, and **which face/overlap target** for **E**.
- **Placement:** **No separate modal “placement mode.”** If **selected slot** has quantity **> 0** and **left-click** hits an **empty** legal cell → decrement stack, add `placed` entry. Otherwise ignore.
- **Unplace:** **Right-click** on **unlocked** placed cell → remove one visual instance, **push one unit** to inventory (merge stack / random free slot per rules below).
- **Overlap priority when pressing E:** If the hero overlaps **both** a **station trigger** and a **placed part** hitbox, **prefer the riddle station** first (document in code). If that is wrong in playtests, switch to **nearest-to-focal-point** rule — **ask** if ambiguous.

### 3.5 Bootstrap response shape (illustrative)

```json
{
  "circuitVariantId": "variant_b_series_led",
  "activeStationIds": ["station_r1", "station_c1"],
  "stations": {
    "station_r1": { "title": "…", "prompt": "…" }
  }
}
```

- Client **must not** infer answers from this payload.

### 3.6 Inventory rules

- **8 slots**, indices **0–7**; keys **`1`–`8`** map to slots **0–7**.
- **New reward:** add to a **random free slot** (slot with no items or empty stack — define: prefer empty slot first, else random among slots that already hold same `type` for stacking, per product preference: **user asked stackable** → prefer **stacking on existing type**, else random empty slot).
- **Stacking:** Multiple of the **same type** in one slot share one row UI with **count**; each pickup may still carry its own **`componentHash`** in an array for final validation.

### 3.7 Grid and circuit representation (frontend check)

- **One grid cell** holds **at most one** placed component.
- **Circuit snapshot for checks** = **array of placed parts**:

```ts
// Conceptual
PlacedPart[] = {
  gridX, gridY,
  type: ComponentType,
  variant: Record<string, unknown>, // e.g. { rOhms: 1000 }, { closed: true }
  componentHash: string | null,    // null for pre-placed props if no hash
  locked: boolean
}[]
```

- **Verification** for a given `circuitVariantId`: **simple `if`/`else`** over that array (and optionally adjacency). **Comment blocks** reserve space for richer **resistor/capacitor network** math — **not required** for first playable.

### 3.8 Manual circuit check

- **`Q`** — runs **frontend** validator only (UX feedback). Does **not** replace **`/validate-circuit-final`**.

### 3.9 Level structure

- **Multiple rooms**, **one level**, **shared inventory and placement state** across room transitions (teleports or map swaps).

---

## 4. How this maps to the current codebase

| Today | Your target |
|-------|-------------|
| [`GameScene.js`](src/game/scenes/GameScene.js) — NPCs, enemies, combat | **Contest mode:** stations + placement grid + pointer handling + **E** / **Q**; strip or guard old systems |
| [`App.js`](src/App.js) | **Code entry** → bootstrap; **riddle modal**; **inventory bar (8 slots)**; hide health/coin in contest |
| Tiled `actions` | Objects with **`stationId`**; optional **placement zone** (tile layer property `contest_placeable` or dedicated layer) |
| `dialogs` in `App.js` | **Superseded** by config from **`/contest/bootstrap`** for contest mode |
| grid-engine | **Player only**; placed parts are **sprites** on grid, not grid-engine characters |

**Mock implementation file:** e.g. [`src/game/api/mockContestBackend.js`](src/game/api/mockContestBackend.js) (all three endpoints, sample codes, sample hashes). **No** answers in GET/bootstrap payloads.

---

## 5. Phased roadmap (super detailed)

Each phase lists **goals**, **deliverables**, **code touchpoints**, **data/API contracts**, **acceptance criteria**, and **dependencies**.

---

### Phase 0 — Map authoring and contest layout baseline

**Goals**

- **Multi-room** single level: Tiled maps + teleports as today, or one map with disjoint walkable regions.
- **Placement zone** clearly authored: e.g. tile property **`contest_placeable: true`** on a dedicated layer, or object-layer rectangles merged at runtime.
- **Station** objects on **`actions`** with **`stationId`**.

**Deliverables**

- Map JSON under [`src/game/assets/sprites/maps/`](src/game/assets/sprites/maps/), preloaded in [`BootScene.js`](src/game/scenes/BootScene.js).
- Short inline legend in this doc or `docs/TILED_CONTEST.md` for `stationId` + `contest_placeable`.

**Code touchpoints**

- [`BootScene.js`](src/game/scenes/BootScene.js), [`MainMenuScene.js`](src/game/scenes/MainMenuScene.js) (`mapKey`).

**Acceptance criteria**

- Player can walk all contest rooms; placement layer is queryable in Phaser (even if placement logic comes later).

**Dependencies**

- None.

---

### Phase 1 — Bootstrap, move, E on station, riddle UI, `POST /validate-answer`

**Goals**

- **Access code** screen → **`POST /contest/bootstrap`** (mock) → store config + **localStorage** seed.
- **E** on **active** `stationId` opens React riddle UI; submit → **`POST /validate-answer`**; on success receive **16-char `componentHash`**, add to inventory (random slot / stacking).
- Block movement while modal open (existing `isShowingDialog` pattern).

**Deliverables**

- `RiddlePopup` + events (`open-riddle`, close callbacks).
- Wire mock **`mockContestBackend.js`**.

**API**

- See §3.2 — **`/contest/bootstrap`**, **`/validate-answer`**.

**Acceptance criteria**

- Wrong answer: no hash, no inventory change. Right answer: hash stored per stack item, visible in slot.

**Dependencies**

- Phase 0.

**Note:** The older Cursor plan may still list `riddleId` / other paths — **align it** with §3.2 when un-holding the plan.

---

### Phase 2 — Full config-driven active stations + polish

**Goals**

- All riddle copy and **activeStationIds** **only** from bootstrap (no hardcoded prompts in React for production path).
- Inactive stations: no open on **E** (optional “inactive” feedback).

**Acceptance criteria**

- Change mock JSON → different active set and text without editing Tiled.

**Dependencies**

- Phase 1.

---

### Phase 3 — Component art + 8-slot HUD + keyboard `1`–`8`

**Goals**

- Preload sprites/tiles for all six types.
- React **inventory bar**: 8 slots, show **count**, highlight **selected** (keys **1–8**).

**Acceptance criteria**

- Selecting empty vs non-empty slot updates UI; state persists in **localStorage** with the blob.

**Dependencies**

- Phase 1 rewards.

---

### Phase 4 — Placement zone + pointer place/unplace

**Goals**

- **Left-click** (canvas): if selected slot has items and cell in **placement zone** and **empty** → place.
- **Right-click**: remove **one** **unlocked** placed part, return to inventory (**stack** / free slot rules §3.6).
- **Pre-placed** parts: `locked: true` in persisted state + Tiled or bootstrap seed.

**Code touchpoints**

- [`GameScene.js`](src/game/scenes/GameScene.js) — pointer → grid; `contest_placeable` query; sync to state module / React.

**Acceptance criteria**

- Cannot place outside zone; cannot place on occupied cell; cannot unplace locked parts.

**Dependencies**

- Phase 3.

---

### Phase 5 — **E** cycles placed-component state

**Goals**

- Overlap / facing rules for “current interactable placed part.”
- Per-type **cycle** tables (resistor steps, switch, etc.).
- Update **localStorage** on each change.

**Acceptance criteria**

- **E** never opens a modal for parts (only stations use modal); cycling is in-world or minimal HUD.

**Dependencies**

- Phase 4.

---

### Phase 6 — Frontend circuit check (**Q**) + commented deep logic

**Goals**

- Implement **`checkCircuitFrontend(circuitVariantId, placed[])`** — **minimal** branching for each variant id you support in mock.
- Add **large commented sections** for future RC / network math.

**Acceptance criteria**

- **Q** shows pass/fail (or debug text) without calling server.

**Dependencies**

- Phase 5.

---

### Phase 7 — `POST /validate-circuit-final` + victory UX

**Goals**

- Serialize **assembly**: full **`PlacedPart[]`** including **hashes** where applicable.
- Mock returns `{ victory: true }` only for the “correct” mock assembly for that code + variant.
- Victory overlay / scene.

**API**

- **`/validate-circuit-final`** body e.g.:

```json
{
  "accessCode": "DEMO2026",
  "circuitVariantId": "variant_b_series_led",
  "parts": [
    {
      "gridX": 3,
      "gridY": 2,
      "type": "resistor",
      "variant": { "rOhms": 1000 },
      "componentHash": "a1b2c3d4e5f67890",
      "locked": false
    }
  ]
}
```

**Acceptance criteria**

- Intentional wrong assembly → `victory: false`; right mock assembly → `victory: true` only from this POST.

**Dependencies**

- Phase 6.

---

### Phase 8 — Real backend integration

**Goals**

- Env-based base URL; swap **`mockContestBackend`** for `fetch` to production; error UI.

**Dependencies**

- Phase 7 contracts frozen.

---

### Cross-cutting — Remove NPCs, enemies, combat for contest

**Goals**

- `ContestGameScene` or `GAME_MODE === 'contest'`; hide **HeroHealth** / **HeroCoin**.

**Schedule**

- After Phase 1 or in parallel; before public demo.

---

## 6. Remaining minor TBDs (implementer choice)

These are **small**; resolve while coding:

- Exact **resistor/capacitor step sets** and default **variant** per type.
- **Random slot** algorithm tie-break when multiple empty slots (use deterministic RNG from `accessCode` if you need reproducible demos).
- Whether **Q** auto-opens a “submit to server” prompt or a separate **Enter** on a menu confirms **`/validate-circuit-final`**.

---

## 7. Suggested timeline mental model

| Phase | Rough focus |
|-------|-------------|
| 0 | Map + `stationId` + placement zone tiles |
| 1 | Code + bootstrap + validate-answer + hash → inventory |
| 2 | Config-only prompts / active set |
| 3 | Art + 8-slot HUD + keys 1–8 |
| 4 | Click place / right unplace + locked seeds |
| 5 | E cycle variants |
| 6 | Q + scaffold checks (math commented) |
| 7 | validate-circuit-final mock + win |
| 8 | Real API |

---

## 8. Changelog (this document)

| Date | Change |
|------|--------|
| 2026-04-06 | Initial phased spec from full problem statement; Phase 1 cross-linked to on-hold implementation plan. |
| 2026-04-06 | Major revision: `stationId`; `/contest/bootstrap`, `/validate-answer`, `/validate-circuit-final`; 16-char hashes; six component types; 8 stackable slots + 1–8 keys; click place/unplace; E station vs E cycle; Q frontend check; localStorage state; multi-room single level; circuit as `PlacedPart[]`; mock file location; out-of-scope leaderboard. |

Add a row whenever you change phase scope or API contracts.
