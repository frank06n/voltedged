import { postContestBootstrap } from '../api/mockContestBackend';

export const CONTEST_STATE_KEY = 'contest_game_state_v1';

function emptySlots() {
    return Array.from({ length: 8 }, (_, slotIndex) => ({
        slotIndex,
        stacks: [],
    }));
}

/**
 * @param {string} accessCode
 * @param {string} circuitVariantId
 */
export function createEmptyState(accessCode, circuitVariantId) {
    return {
        accessCode,
        circuitVariantId,
        inventorySlots: emptySlots(),
        selectedSlotIndex: 0,
        placed: [],
        solvedStationIds: [],
    };
}

export function loadContestState() {
    try {
        const raw = localStorage.getItem(CONTEST_STATE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export function saveContestState(state) {
    localStorage.setItem(CONTEST_STATE_KEY, JSON.stringify(state));
}

/**
 * Merge bootstrap into persisted state (keeps inventory if same access code).
 * @param {string} accessCode
 * @param {object} config from postContestBootstrap
 */
export async function bootstrapContestSession(accessCode) {
    const config = await postContestBootstrap(accessCode);
    const prev = loadContestState();
    if (prev && prev.accessCode === accessCode.trim()) {
        const next = {
            ...prev,
            circuitVariantId: config.circuitVariantId,
        };
        saveContestState(next);
        return { config, state: next };
    }
    const state = createEmptyState(accessCode.trim(), config.circuitVariantId);
    saveContestState(state);
    return { config, state };
}

/**
 * @param {object} state
 * @param {{ stationId: string, componentHash: string, rewardComponentType: string }} reward
 */
export function appendSolvedComponent(state, reward) {
    const { stationId, componentHash, rewardComponentType } = reward;
    const solvedStationIds = state.solvedStationIds.includes(stationId)
        ? state.solvedStationIds
        : [...state.solvedStationIds, stationId];

    const inventorySlots = state.inventorySlots.map((slot) => ({
        ...slot,
        stacks: slot.stacks.map((s) => ({
            ...s,
            componentHashes: [...(s.componentHashes || [])],
        })),
    }));

    const type = rewardComponentType || 'unknown';
    let stacked = false;

    for (let i = 0; i < inventorySlots.length && !stacked; i++) {
        const stack = inventorySlots[i].stacks.find((s) => s.type === type);
        if (stack) {
            stack.count = (stack.count || 0) + 1;
            stack.componentHashes = stack.componentHashes || [];
            stack.componentHashes.push(componentHash);
            stacked = true;
        }
    }

    if (!stacked) {
        for (let i = 0; i < inventorySlots.length && !stacked; i++) {
            if (inventorySlots[i].stacks.length === 0) {
                inventorySlots[i].stacks.push({
                    type,
                    count: 1,
                    componentHashes: [componentHash],
                });
                stacked = true;
            }
        }
    }

    const next = {
        ...state,
        solvedStationIds,
        inventorySlots,
    };
    saveContestState(next);
    return next;
}
