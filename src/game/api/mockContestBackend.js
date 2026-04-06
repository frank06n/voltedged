/**
 * Mock contest API — swap fetch base URL for production later.
 * Logical paths: POST /contest/bootstrap, POST /validate-answer, POST /validate-circuit-final
 */

const KNOWN_CODES = {
    DEMO: {
        circuitVariantId: 'variant_b_series_led',
        activeStationIds: ['station_r1', 'station_c1'],
        stations: {
            station_r1: {
                title: 'First bench',
                prompt: 'I oppose current flow in a DC path; my unit is the ohm. What am I? (one word)',
                rewardComponentType: 'resistor',
            },
            station_c1: {
                title: 'Second bench',
                prompt: 'I store energy in an electric field between two plates. What am I? (one word)',
                rewardComponentType: 'capacitor',
            },
        },
    },
};

/** stationId -> normalized acceptable answers (lowercase) */
const ANSWER_KEYS = {
    station_r1: ['resistor'],
    station_c1: ['capacitor'],
};

/** stationId -> 16-char hex component hash issued on correct answer */
const STATION_HASH = {
    station_r1: 'a1b2c3d4e5f67890',
    station_c1: 'f9e8d7c6b5a43210',
};

function normalizeAnswer(s) {
    return String(s || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');
}

/**
 * @param {string} accessCode
 * @returns {Promise<object>} contest config (no answers)
 */
export async function postContestBootstrap(accessCode) {
    const key = String(accessCode || '').trim().toUpperCase();
    const config = KNOWN_CODES[key];
    await Promise.resolve();
    if (!config) {
        const err = new Error('Unknown access code');
        err.code = 'INVALID_ACCESS_CODE';
        throw err;
    }
    return { ...config };
}

/**
 * @param {{ accessCode: string, stationId: string, answer: string }} body
 * @returns {Promise<{ valid: boolean, componentHash?: string }>}
 */
export async function postValidateAnswer(body) {
    const { accessCode, stationId, answer } = body;
    const key = String(accessCode || '').trim().toUpperCase();
    await Promise.resolve();
    if (!KNOWN_CODES[key]) {
        return { valid: false };
    }
    const accepted = ANSWER_KEYS[stationId];
    if (!accepted) {
        return { valid: false };
    }
    const norm = normalizeAnswer(answer);
    const ok = accepted.some((a) => norm === a || norm.split(' ').includes(a));
    if (!ok) {
        return { valid: false };
    }
    const componentHash = STATION_HASH[stationId];
    if (!componentHash || componentHash.length !== 16) {
        return { valid: false };
    }
    return { valid: true, componentHash };
}

/**
 * @param {{ accessCode: string, circuitVariantId: string, assembly: unknown }} body
 * @returns {Promise<{ victory: boolean }>}
 */
export async function postValidateCircuitFinal(body) {
    await Promise.resolve();
    const key = String(body?.accessCode || '').trim().toUpperCase();
    if (!KNOWN_CODES[key]) {
        return { victory: false };
    }
    // Phase 1 mock: not wired to real assembly checks yet
    return { victory: false };
}
