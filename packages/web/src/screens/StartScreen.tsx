import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../store/gameStore';
import LeaderboardCard from '../components/LeaderboardCard';
import { CREDITS } from '../creditsContent';

const CHEAT_CODE = 'uuddlrlrba';
const ALL_CHARACTERS = [
  'fighter1', 'fighter1_alt',
  'fighter2', 'fighter2_alt',
  'fighter3', 'fighter3_alt',
  'fighter4', 'fighter4_alt',
  'fighter5', 'fighter5_alt',
];

interface Props { active: boolean; entering?: boolean; }

export default function StartScreen({ active, entering }: Props) {
  const { t } = useTranslation('ui');
  const setScreen = useGameStore(s => s.setScreen);
  const setGameMode = useGameStore(s => s.setGameMode);
  const lobbyJoinError = useGameStore(s => s.lobbyJoinError);

  const joinCodeRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [cheatActive, setCheatActive] = useState(false);

  // Pre-fill room code from ?room=CODE URL param on first mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('room');
    if (code && joinCodeRef.current) {
      joinCodeRef.current.value = code.toUpperCase();
    }
  }, []);

  const errorMsg = localError ?? lobbyJoinError;

  function goToCharacterSelect(mode: 'quick' | 'friend' | 'practice' | 'campaign') {
    setGameMode(mode);
    useGameStore.setState({ lobbyJoinError: null });
    setLocalError(null);
    setScreen('character-select');
  }

  function handleJoinRoom() {
    const raw = joinCodeRef.current?.value.trim() ?? '';
    if (raw.toLowerCase() === CHEAT_CODE) {
      useGameStore.setState({ unlockedCharacterIds: ALL_CHARACTERS } as never);
      joinCodeRef.current!.value = '';
      setLocalError(null);
      setCheatActive(true);
      setTimeout(() => setCheatActive(false), 2500);
      return;
    }
    const code = raw.toUpperCase();
    if (code.length !== 6 || !/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/.test(code)) {
      setLocalError(t('start.invalid_room_code'));
      return;
    }
    setLocalError(null);
    useGameStore.setState({ lobbyJoinError: null, pendingJoinCode: code } as never);
    goToCharacterSelect('friend');
  }

  return (
    <div id="screen-start" className={`screen${active ? ' active' : ''}${entering ? ' entering' : ''}`}>
      <div className="start-bg" />
      <div className="start-logo-container">
        <img className="start-logo-top"    src="/assets/ui/Logo1_Sudoku.svg"   alt="Sudoku" />
        <img className="start-logo-bottom" src="/assets/ui/Logo2_Fighting.svg" alt="Fighting" />
      </div>

      <div className="start-columns">

        {/* Column 1 — 2 Player Online */}
        <div className="start-section">
          <span className="start-mode-label">{t('start.online_mode')}</span>
          <span className="start-action-hint">{t('start.enter_queue')}</span>
          <button className="btn" onClick={() => goToCharacterSelect('quick')}>
            {t('start.quick_match')}
          </button>
          <span className="start-action-hint">{t('start.play_friend')}</span>
          <button className="btn btn-secondary" onClick={() => goToCharacterSelect('friend')}>
            {t('start.create_room')}
          </button>
          <div className="combo-input">
            <input
              ref={joinCodeRef}
              className="combo-text"
              type="text"
              maxLength={10}
              placeholder={t('start.room_code_placeholder')}
              onKeyDown={e => e.key === 'Enter' && handleJoinRoom()}
            />
            <button id="btn-join-room" onClick={handleJoinRoom}>{t('start.join')}</button>
          </div>
          <p className={`field-message${(cheatActive || errorMsg) ? ' visible' : ''}${cheatActive ? ' confirm' : ' error'}`}>
            {cheatActive ? t('start.all_unlocked') : (errorMsg ?? '\u00A0')}
          </p>
        </div>

        {/* Column 2 — Single Player */}
        <div id="start-single-player" className="start-section">
          <span className="start-mode-label">{t('start.single_player')}</span>
          <button className="btn btn-alt" onClick={() => goToCharacterSelect('campaign')}>
            {t('start.campaign')}
          </button>
          <button className="btn btn-secondary" onClick={() => goToCharacterSelect('practice')}>
            {t('start.practice')}
          </button>
        </div>

        {/* Column 3 — Leaderboard card */}
        <div className="start-section">
          <LeaderboardCard />
        </div>

      </div>

      <div className="screen-footer">
        <span className="screen-footer-tagline">{t('start.tagline')}</span>
        <span className="screen-footer-copy">{CREDITS.find(l => l.text?.startsWith('©'))?.text}</span>
        <button className="privacy-footer-link" onClick={() => setScreen('privacy')}>{t('start.privacy_policy')}</button>
      </div>
    </div>
  );
}
