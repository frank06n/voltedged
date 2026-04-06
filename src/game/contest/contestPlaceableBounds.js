/**
 * Placement zone in tile coordinates (inclusive).
 * Grid-engine walks every tile layer for collision; a separate decorative
 * "contest_placeable" tile layer was removed to avoid Phaser/grid-engine
 * tile-data crashes — use this table until placement is driven from Tiled objects.
 */
export const CONTEST_PLACEABLE_TILE_RECTS_BY_MAP = {
    home_page_city_house_01: { minTileX: 3, maxTileX: 6, minTileY: 7, maxTileY: 10 },
};

export function isTileContestPlaceable(mapKey, tileX, tileY) {
    const r = CONTEST_PLACEABLE_TILE_RECTS_BY_MAP[mapKey];
    if (!r) {
        return false;
    }
    return (
        tileX >= r.minTileX
        && tileX <= r.maxTileX
        && tileY >= r.minTileY
        && tileY <= r.maxTileY
    );
}
