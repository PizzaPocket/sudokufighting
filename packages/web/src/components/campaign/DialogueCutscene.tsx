import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { setupNextFight } from '../../ai/useCampaign';
import { playTextBlip } from '../../audio/audioManager';

const TYPEWRITER_INTERVAL_MS = 18;
const FADE_IN_MS  = 400;
const FADE_OUT_MS = 280;

type Phase = 'entering' | 'active' | 'leaving';

interface Props { active: boolean; }

export default function DialogueCutscene({ active }: Props) {
  const { t } = useTranslation('ui');
  const queue = useGameStore(s => s.campaignDialogueQueue);

  const [queueIndex, setQueueIndex] = useState(0);
  const [lineIndex,  setLineIndex]  = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping]     = useState(false);
  const [phase, setPhase]           = useState<Phase>('entering');

  const typewriterRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentEntry = queue[queueIndex] ?? null;
  const currentLine  = currentEntry?.lines[lineIndex] ?? '';

  function clearTypewriter() {
    if (typewriterRef.current) { clearInterval(typewriterRef.current); typewriterRef.current = null; }
  }
  function clearPhaseTimer() {
    if (phaseTimerRef.current) { clearTimeout(phaseTimerRef.current); phaseTimerRef.current = null; }
  }

  // Reset everything when screen activates
  useEffect(() => {
    if (!active) { clearTypewriter(); clearPhaseTimer(); return; }
    setQueueIndex(0);
    setLineIndex(0);
    setDisplayedText('');
    setIsTyping(false);
    setPhase('entering');
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  // entering → active after portrait fade-in delay → start typewriter
  useEffect(() => {
    if (!active || phase !== 'entering') return;
    clearTypewriter();
    setDisplayedText('');
    clearPhaseTimer();
    phaseTimerRef.current = setTimeout(() => setPhase('active'), FADE_IN_MS);
    return clearPhaseTimer;
  }, [active, phase, queueIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // active → run typewriter for current line
  useEffect(() => {
    if (!active || phase !== 'active') return;
    setDisplayedText('');
    setIsTyping(true);
    let i = 0;
    typewriterRef.current = setInterval(() => {
      i++;
      const char = currentLine[i - 1];
      if (char && char !== ' ') playTextBlip();
      setDisplayedText(currentLine.slice(0, i));
      if (i >= currentLine.length) {
        clearTypewriter();
        setIsTyping(false);
      }
    }, TYPEWRITER_INTERVAL_MS);
    return clearTypewriter;
  }, [active, phase, queueIndex, lineIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleNext() {
    if (!currentEntry) return;

    // Snap typewriter to full line
    if (isTyping) {
      clearTypewriter();
      setDisplayedText(currentLine);
      setIsTyping(false);
      return;
    }

    const isLastLine  = lineIndex >= (currentEntry.lines.length - 1);
    const isLastEntry = queueIndex >= queue.length - 1;

    // Advance line within same entry
    if (!isLastLine) {
      setLineIndex(l => l + 1);
      return;
    }

    // Fade out portrait, then either show next entry or start fight
    clearPhaseTimer();
    setPhase('leaving');

    if (!isLastEntry) {
      phaseTimerRef.current = setTimeout(() => {
        setQueueIndex(q => q + 1);
        setLineIndex(0);
        setPhase('entering');
      }, FADE_OUT_MS);
    } else {
      // All dialogue done — call setupNextFight now (safe: no fight is visible),
      // then switch to gameplay. useVsAI auto-starts the round on mount.
      phaseTimerRef.current = setTimeout(() => {
        const st = useGameStore.getState();
        setupNextFight(st.campaignFightIndex, st.myCharacter, st.characters);
        const myChar = st.characters.find(c => c.id === st.myCharacter);
        useGameStore.setState({
          mySeat: 0,
          myName: myChar?.name ?? 'Player',
          campaignResult: null,
          campaignDialogueQueue: [],
          preRoundSignal: null,  // clear stale signal so GameOverlay doesn't replay previous round number on mount
          currentScreen: 'gameplay',
        } as never);
      }, FADE_OUT_MS);
    }
  }

  const nextLabel = isTyping
    ? '▶▶'
    : lineIndex < (currentEntry?.lines.length ?? 1) - 1 || queueIndex < queue.length - 1
    ? t('dialogue.next')
    : 'FIGHT!';

  const bgStyle = currentEntry?.backgroundSrc
    ? { backgroundImage: `url(${currentEntry.backgroundSrc})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : undefined;

  return (
    <div
      id="screen-campaign-dialogue"
      className={`screen${active ? ' active' : ''}`}
      style={bgStyle}
      onClick={handleNext}
    >
      {currentEntry && (
        <>
          <img
            key={queueIndex}
            className={`dialogue-portrait${phase === 'leaving' ? ' dialogue-portrait--out' : ''}`}
            src={currentEntry.portraitPath}
            alt={currentEntry.speakerName}
            draggable={false}
          />
          <div
            className="dialogue-panel"
            style={phase !== 'active' ? { visibility: 'hidden' } : undefined}
            onClick={e => e.stopPropagation()}
          >
            <div className="dialogue-speaker">{currentEntry.speakerName}</div>
            <div className="dialogue-divider" />
            <p className="dialogue-text">
              {currentLine.split('').map((char, i) => (
                <span key={i} style={i >= displayedText.length ? { color: 'transparent' } : undefined}>{char}</span>
              ))}
            </p>
            <div className="dialogue-footer">
              <button className="btn btn-sm btn-secondary dialogue-next-btn" onClick={handleNext}>
                {nextLabel}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
