import { useCallback, useEffect, useRef, useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { Backdrop, Button, Fade, Modal, TextField, Typography } from '@material-ui/core';
import { postValidateAnswer } from './api/mockContestBackend';
import { appendSolvedComponent, loadContestState } from './contest/contestState';

const useStyles = makeStyles((theme) => ({
    modal: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    paper: {
        backgroundColor: theme.palette.background.paper,
        border: '2px solid #000',
        boxShadow: theme.shadows[5],
        padding: theme.spacing(2, 3),
        maxWidth: 480,
        width: '90%',
        fontFamily: '"Press Start 2P"',
    },
    title: {
        fontSize: 10,
        marginBottom: theme.spacing(1),
        textTransform: 'uppercase',
    },
    prompt: {
        fontSize: 8,
        lineHeight: 1.6,
        marginBottom: theme.spacing(2),
        whiteSpace: 'pre-wrap',
    },
    field: {
        marginBottom: theme.spacing(2),
        width: '100%',
        '& .MuiInputBase-input': {
            fontFamily: '"Press Start 2P"',
            fontSize: 10,
        },
    },
    actions: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: theme.spacing(1),
    },
    error: {
        color: '#c62828',
        fontSize: 8,
        marginBottom: theme.spacing(1),
    },
}));

export default function RiddlePopup({
    open,
    onClose,
    stationId,
    title,
    prompt,
    accessCode,
    rewardComponentType,
}) {
    const classes = useStyles();
    const inputRef = useRef(null);
    const [answer, setAnswer] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!open) {
            return;
        }
        const t = window.setTimeout(() => {
            inputRef.current?.focus();
        }, 50);
        return () => window.clearTimeout(t);
    }, [open, stationId]);

    const handleClose = useCallback(() => {
        window.dispatchEvent(new CustomEvent('station-riddle-closed'));
        setAnswer('');
        setError('');
        setSubmitting(false);
        onClose();
    }, [onClose]);

    const handleSubmit = useCallback(async () => {
        setError('');
        setSubmitting(true);
        try {
            const res = await postValidateAnswer({
                accessCode,
                stationId,
                answer,
            });
            if (!res.valid || !res.componentHash) {
                setError('Not quite — try again.');
                setSubmitting(false);
                return;
            }
            const prev = loadContestState();
            if (prev) {
                appendSolvedComponent(prev, {
                    stationId,
                    componentHash: res.componentHash,
                    rewardComponentType: rewardComponentType || 'unknown',
                });
            }
            handleClose();
        } catch {
            setError('Something went wrong.');
        }
        setSubmitting(false);
    }, [accessCode, answer, handleClose, rewardComponentType, stationId]);

    return (
        <Modal
            className={classes.modal}
            open={open}
            onClose={handleClose}
            closeAfterTransition
            BackdropComponent={Backdrop}
            BackdropProps={{ timeout: 500 }}
            disableAutoFocus={false}
            disableEnforceFocus={false}
            TransitionProps={{
                onEntered: () => {
                    inputRef.current?.focus();
                },
            }}
        >
            <Fade in={open}>
                <div
                    className={classes.paper}
                    style={{
                        imageRendering: 'pixelated',
                    }}
                >
                    <Typography className={classes.title} component="h2">
                        {title || stationId}
                    </Typography>
                    <Typography className={classes.prompt} component="p">
                        {prompt}
                    </Typography>
                    {error ? (
                        <Typography className={classes.error} component="p">
                            {error}
                        </Typography>
                    ) : null}
                    <TextField
                        className={classes.field}
                        variant="outlined"
                        size="small"
                        placeholder="Your answer"
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        inputRef={inputRef}
                        onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === 'Enter') {
                                handleSubmit();
                            }
                        }}
                        disabled={submitting}
                        autoFocus
                    />
                    <div className={classes.actions}>
                        <Button size="small" onClick={handleClose} disabled={submitting}>
                            Cancel
                        </Button>
                        <Button
                            size="small"
                            color="primary"
                            variant="contained"
                            onClick={handleSubmit}
                            disabled={submitting}
                        >
                            Submit
                        </Button>
                    </div>
                </div>
            </Fade>
        </Modal>
    );
}
