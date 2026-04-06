import { useCallback, useEffect, useState } from 'react';
import Phaser from 'phaser';
import GridEngine from 'grid-engine';
import BootScene from './game/scenes/BootScene';
import MainMenuScene from './game/scenes/MainMenuScene';
import GameOverScene from './game/scenes/GameOverScene';
import GameScene from './game/scenes/GameScene';
import { makeStyles } from '@material-ui/core/styles';
import { Button, TextField, Typography } from '@material-ui/core';
import dialogBorderBox from './game/assets/images/dialog_borderbox.png';
import GameMenu from "./game/GameMenu";
import DialogBox from "./game/DialogBox";
import HeroCoin from "./game/HeroCoin";
import HeroHealth from "./game/HeroHealth";
import RiddlePopup from './game/RiddlePopup';
import './App.css';
import { calculateGameSize } from "./game/utils";
import { bootstrapContestSession, loadContestState } from './game/contest/contestState';

const { width, height, multiplier } = calculateGameSize();

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
    padding: theme.spacing(2, 4, 3),
    overflow: 'auto',
  },
  postContainer: {
    maxWidth: '90%',
    maxHeight: '90%',
  },
  gameContentWrapper: {
    width: `${width * multiplier}px`,
    height: `${height * multiplier}px`,
    margin: 'auto',
    padding: 0,
    overflow: 'hidden',
    '& canvas': {
      imageRendering: 'pixelated',
      '-ms-interpolation-mode': 'nearest-neighbor',
      boxShadow: '0px 0px 0px 3px rgba(0,0,0,0.75)',
    },
  },
  pageWrapper: {
    background: theme.palette.background.paper,
    padding: 0,
    margin: 0,
  },
  loadingText: {
    fontFamily: '"Press Start 2P"',
    marginTop: '30px',
    marginLeft: '30px',
  },
  contestBar: {
    fontFamily: '"Press Start 2P"',
    padding: '8px 12px',
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(0,0,0,0.85)',
    color: '#fff',
    fontSize: '10px',
  },
  contestField: {
    '& .MuiInputBase-input': {
      fontFamily: '"Press Start 2P"',
      fontSize: '10px',
    },
  },
  preLoadDialogImage: {
    backgroundImage: `url("${dialogBorderBox}")`,
    backgroundSize: '1px',
    backgroundRepeat: 'no-repeat',
  },
  gameWrapper: {
    color: '#FFFFFF',
  },
  gameGif: {
    width: '100%',
    position: 'absolute',
    imageRendering: 'pixelated',
    top: 0,
  },
}));

const dialogs = {
  "npc_01": [{
    "message": "Hello",
  }, {
    "message": "How are you?",
  }],
  "npc_02": [{
    "message": "Hello there",
  }],
  "npc_03": [{
    "message": "Hi",
  }, {
    "message": "Ok bye!",
  }],
  "npc_04": [{
    "message": "Hey",
  }],
  "sword": [{
    "message": "You got a sword",
  }],
  "push": [{
    "message": "You can push boxes now",
  }],
  "sign_01": [{
    "message": "You can read this!",
  }],
  "book_01": [{
    "message": "Welcome to the game!",
  }]
};

function App() {
  const classes = useStyles();
  const [messages, setMessages] = useState([]);
  const [characterName, setCharacterName] = useState('');
  const [gameMenuItems, setGameMenuItems] = useState([]);
  const [gameMenuPosition, setGameMenuPosition] = useState('center');
  const [heroHealthStates, setHeroHealthStates] = useState([]);
  const [heroCoins, setHeroCoins] = useState(null);
  const [accessCodeInput, setAccessCodeInput] = useState('DEMO');
  const [accessMsg, setAccessMsg] = useState('');
  const [contestReady, setContestReady] = useState(false);
  const [riddlePayload, setRiddlePayload] = useState(null);

  const handleContestBootstrap = useCallback(async () => {
    setAccessMsg('');
    try {
      const { config, state } = await bootstrapContestSession(accessCodeInput);
      window.__CONTEST_SESSION__ = { accessCode: state.accessCode, config };
      setContestReady(true);
      setAccessMsg('Session ready — start the game from the menu.');
    } catch (e) {
      setContestReady(false);
      window.__CONTEST_SESSION__ = undefined;
      setAccessMsg(e.message || 'Could not start contest session.');
    }
  }, [accessCodeInput]);

  const handleMessageIsDone = useCallback(() => {
    const customEvent = new CustomEvent(`${characterName}-dialog-finished`, {
      detail: {},
    });
    window.dispatchEvent(customEvent);

    setMessages([]);
    setCharacterName('');
  }, [characterName]);

  const handleMenuItemSelected = useCallback((selectedItem) => {
    setGameMenuItems([]);

    const customEvent = new CustomEvent('menu-item-selected', {
      detail: {
        selectedItem,
      },
    });
    window.dispatchEvent(customEvent);
  }, []);

  useEffect(() => {
    const restore = async () => {
      const prev = loadContestState();
      if (!prev?.accessCode) {
        return;
      }
      setAccessCodeInput(prev.accessCode);
      try {
        const { config, state } = await bootstrapContestSession(prev.accessCode);
        window.__CONTEST_SESSION__ = { accessCode: state.accessCode, config };
        setContestReady(true);
        setAccessMsg('Restored session from browser storage.');
      } catch {
        window.__CONTEST_SESSION__ = undefined;
      }
    };
    restore();
  }, []);

  useEffect(() => {
    new Phaser.Game({
      type: Phaser.AUTO,
      title: 'some-game-title',
      parent: 'game-content',
      orientation: Phaser.Scale.LANDSCAPE,
      localStorageName: 'some-game-title',
      width,
      height,
      autoRound: true,
      pixelArt: true,
      scale: {
        autoCenter: Phaser.Scale.CENTER_BOTH,
        mode: Phaser.Scale.ENVELOP,
      },
      scene: [
        BootScene,
        MainMenuScene,
        GameScene,
        GameOverScene,
      ],
      physics: {
        default: 'arcade',
      },
      plugins: {
        scene: [
          {
            key: 'gridEngine',
            plugin: GridEngine,
            mapping: 'gridEngine',
          },
        ],
      },
      backgroundColor: '#000000',
    });

    // window.phaserGame = game;
  }, []);

  useEffect(() => {
    const dialogBoxEventListener = ({ detail }) => {
      // TODO fallback
      setCharacterName(detail.characterName);
      setMessages(
          dialogs[detail.characterName]
      );
    };
    window.addEventListener('new-dialog', dialogBoxEventListener);

    const gameMenuEventListener = ({ detail }) => {
      setGameMenuItems(detail.menuItems);
      setGameMenuPosition(detail.menuPosition);
    };
    window.addEventListener('menu-items', gameMenuEventListener);

    const heroHealthEventListener = ({ detail }) => {
      setHeroHealthStates(detail.healthStates);
    };
    window.addEventListener('hero-health', heroHealthEventListener);

    const heroCoinEventListener = ({ detail }) => {
      setHeroCoins(detail.heroCoins);
    };
    window.addEventListener('hero-coin', heroCoinEventListener);

    return () => {
      window.removeEventListener('new-dialog', dialogBoxEventListener);
      window.removeEventListener('menu-items', gameMenuEventListener);
      window.removeEventListener('hero-health', heroHealthEventListener);
      window.removeEventListener('hero-coin', heroCoinEventListener);
    };
  }, [setCharacterName, setMessages]);

  useEffect(() => {
    const openRiddle = ({ detail }) => {
      setRiddlePayload(detail || null);
    };
    window.addEventListener('open-station-riddle', openRiddle);
    return () => window.removeEventListener('open-station-riddle', openRiddle);
  }, []);

  useEffect(() => {
    if (!riddlePayload) {
      return;
    }
    const canvas = document.querySelector('#game-content canvas');
    canvas?.blur();
  }, [riddlePayload]);

  return (
      <div>
        <div className={classes.contestBar}>
          <Typography component="span" variant="body2">
            Contest access code
          </Typography>
          <TextField
              className={classes.contestField}
              size="small"
              variant="outlined"
              value={accessCodeInput}
              onChange={(e) => setAccessCodeInput(e.target.value)}
              placeholder="DEMO"
          />
          <Button
              size="small"
              color="primary"
              variant="contained"
              onClick={handleContestBootstrap}
          >
            Enter contest
          </Button>
          {accessMsg ? (
              <Typography component="span" variant="body2">
                {accessMsg}
              </Typography>
          ) : null}
          {contestReady ? (
              <Typography component="span" variant="body2">
                (E or Enter at a station)
              </Typography>
          ) : null}
        </div>
        <div className={classes.gameWrapper}>
          <div
              id="game-content"
              className={classes.gameContentWrapper}
              style={riddlePayload ? { pointerEvents: 'none' } : undefined}
          >
            {/* this is where the game canvas will be rendered */}
          </div>
          {heroHealthStates.length > 0 && (
              <HeroHealth
                  gameSize={{
                    width,
                    height,
                    multiplier,
                  }}
                  healthStates={heroHealthStates}
              />
          )}
          {heroCoins !== null && (
              <HeroCoin
                  gameSize={{
                    width,
                    height,
                    multiplier,
                  }}
                  heroCoins={heroCoins}
              />
          )}
          {messages.length > 0 && (
              <DialogBox
                  onDone={handleMessageIsDone}
                  characterName={characterName}
                  messages={messages}
                  gameSize={{
                    width,
                    height,
                    multiplier,
                  }}
              />
          )}
          {gameMenuItems.length > 0 && (
              <GameMenu
                  items={gameMenuItems}
                  gameSize={{
                    width,
                    height,
                    multiplier,
                  }}
                  position={gameMenuPosition}
                  onSelected={handleMenuItemSelected}
              />
          )}
          <RiddlePopup
              open={Boolean(riddlePayload)}
              onClose={() => setRiddlePayload(null)}
              stationId={riddlePayload?.stationId}
              title={riddlePayload?.title}
              prompt={riddlePayload?.prompt}
              accessCode={riddlePayload?.accessCode}
              rewardComponentType={riddlePayload?.rewardComponentType}
          />
        </div>
      </div>
  );
}

export default App;
