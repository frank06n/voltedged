import { useEffect, useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { Typography } from '@material-ui/core';
import { loadContestState } from './contest/contestState';

const useStyles = makeStyles((theme) => ({
    wrap: {
        fontFamily: '"Press Start 2P"',
        padding: '8px 12px',
        background: 'rgba(0,0,0,0.85)',
        color: '#fff',
        fontSize: '8px',
        lineHeight: 1.5,
        maxWidth: `${400 * 4}px`,
        margin: '0 auto',
    },
    heading: {
        fontSize: '8px',
        marginBottom: theme.spacing(1),
        opacity: 0.9,
    },
    row: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px',
    },
    slot: {
        border: '1px solid rgba(255,255,255,0.35)',
        padding: '4px 6px',
        minWidth: '72px',
        minHeight: '48px',
        boxSizing: 'border-box',
    },
    slotEmpty: {
        opacity: 0.45,
    },
}));

function formatSlotSummary(stacks) {
    if (!stacks || stacks.length === 0) {
        return '—';
    }
    const parts = stacks.map((s) => {
        const n = s.count || 1;
        const hashes = s.componentHashes || [];
        const hashHint = hashes[0] ? ` ${String(hashes[0]).slice(0, 4)}…` : '';
        return `${s.type}×${n}${hashHint}`;
    });
    return parts.join(' · ');
}

export default function ContestInventoryBar({ visible }) {
    const classes = useStyles();
    const [tick, setTick] = useState(0);

    useEffect(() => {
        const onChanged = () => setTick((t) => t + 1);
        window.addEventListener('contest-state-changed', onChanged);
        return () => window.removeEventListener('contest-state-changed', onChanged);
    }, []);

    useEffect(() => {
        if (visible) {
            setTick((t) => t + 1);
        }
    }, [visible]);

    if (!visible) {
        return null;
    }

    const state = loadContestState();
    const slots = state?.inventorySlots
        || Array.from({ length: 8 }, (_, slotIndex) => ({ slotIndex, stacks: [] }));

    return (
        <div className={classes.wrap} data-inventory-revision={tick}>
            <Typography className={classes.heading} component="div">
                Inventory (read-only)
            </Typography>
            <div className={classes.row}>
                {slots.map((slot) => {
                    const empty = !slot.stacks || slot.stacks.length === 0;
                    return (
                        <div
                            key={slot.slotIndex}
                            className={`${classes.slot} ${empty ? classes.slotEmpty : ''}`}
                        >
                            <div>{slot.slotIndex + 1}</div>
                            <div>{formatSlotSummary(slot.stacks)}</div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
