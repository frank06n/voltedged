# Tiled conventions — contest mini-game

This supplements [CONTEST_GAME_PHASED_SPEC.md](./CONTEST_GAME_PHASED_SPEC.md) for map authoring.

## Object layer `actions`

| Property | Type | Meaning |
|----------|------|---------|
| `stationId` | string | Unique id for a riddle kiosk on this level. Prompts and whether the station is active come from **`POST /contest/bootstrap`**, not from the map. |

Do **not** use `riddleId` on new contest maps.

## Placement zone

Components may only be placed where the level defines a **placement mask**.

**Current repo approach:** an extra **decorative tile layer** for placement was **not** used, because **grid-engine** considers **every** Phaser tile layer when resolving collisions, and that extra layer led to **Phaser `GetTileAt` crashes** near map edges. Instead, **`src/game/contest/contestPlaceableBounds.js`** defines **inclusive tile rectangles per `mapKey`** (e.g. `home_page_city_house_01`). Use **`GameScene#isWorldXYContestPlaceable(worldX, worldY)`** (or `isTileContestPlaceable(mapKey, tileX, tileY)`).

Later you can switch to **Tiled object** rectangles or **tile properties** on an existing layer and merge that data into the same helper.

## File locations

Contest-capable house maps live under `src/game/assets/sprites/maps/houses/`. Each map used as the contest entry must be imported and `load.tilemapTiledJSON` in `BootScene.js`, and the same key passed from `MainMenuScene` as `mapKey`.
