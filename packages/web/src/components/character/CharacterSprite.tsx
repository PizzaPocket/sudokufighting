import React, { useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { AnimationController, preloadCharacterSprites } from '../../hooks/useAnimation';
import type { AnimSignal } from '../../store/gameStore';
import MistakeEffect from './MistakeEffect';

interface Props {
  seat: 0 | 1;
  flipped?: boolean;
  id: string;
  wrapId: string;
}

export default function CharacterSprite({ seat, flipped, id, wrapId }: Props) {
  const imgRef = useRef<HTMLImageElement>(null);
  const controllerRef = useRef<AnimationController | null>(null);

  const signal = useGameStore(s => seat === 0 ? s.p1AnimSignal : s.p2AnimSignal) as AnimSignal | null;
  const isPaused = useGameStore(s => s.isPaused);

  // Derive characterId from mySeat + myCharacter / opponentCharacter
  const mySeat = useGameStore(s => s.mySeat);
  const myCharacter = useGameStore(s => s.myCharacter);
  const opponentCharacter = useGameStore(s => s.opponentCharacter);
  const myUseAlt = useGameStore(s => s.myUseAlt);
  const opponentUseAlt = useGameStore(s => s.opponentUseAlt);
  const characters = useGameStore(s => s.characters);

  function resolveCharId(s: 0 | 1) {
    const isMe = s === mySeat;
    const charId = isMe ? myCharacter : opponentCharacter;
    const useAlt = isMe ? myUseAlt : opponentUseAlt;
    if (!charId) return null;
    if (!useAlt) return charId;
    const char = characters.find(c => c.id === charId);
    return char?.altId ?? charId;
  }

  const resolvedCharId = resolveCharId(seat);

  // Initialize or swap controller when character changes
  useEffect(() => {
    if (!resolvedCharId || !imgRef.current) return;
    preloadCharacterSprites(resolvedCharId);
    if (!controllerRef.current) {
      controllerRef.current = new AnimationController(resolvedCharId, imgRef.current);
    } else {
      controllerRef.current.setCharacter(resolvedCharId);
      controllerRef.current.setImage(imgRef.current);
    }
    controllerRef.current.reset(seat === 1 ? 3 : 1);
  }, [resolvedCharId]);

  // Pause/resume animation controller with game pause state
  useEffect(() => {
    if (!controllerRef.current) return;
    if (isPaused) {
      controllerRef.current.pause();
    } else {
      controllerRef.current.resume();
    }
  }, [isPaused]);

  // Respond to animation signals; null signal resets to idle (e.g. between rounds)
  useEffect(() => {
    if (!controllerRef.current) return;
    if (!signal) {
      controllerRef.current.reset(seat === 1 ? 3 : 1); // clears priority, returns to idle
      return;
    }
    controllerRef.current.play(signal.state);
  }, [signal?.state, signal?.nonce]);

  if (!resolvedCharId) return null;

  return (
    <div
      id={wrapId}
      className={`character-wrap${flipped ? ' flipped' : ''}`}
    >
      <MistakeEffect seat={seat} />
      <img
        id={id}
        ref={imgRef}
        className="character-sprite"
        alt=""
        src={`/characters/${resolvedCharId}/idle_frame1.svg`}
      />
    </div>
  );
}
