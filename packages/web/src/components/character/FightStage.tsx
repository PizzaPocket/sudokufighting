import React from 'react';
import CharacterSprite from './CharacterSprite';
import CounterBar from '../hud/CounterBar';

export default function FightStage() {
  return (
    <div id="fight-stage">
      <div className="fight-characters">
        <div className="fight-characters-inner">
          <CharacterSprite seat={0} id="p1-char-img" wrapId="p1-char-wrap" />
          <CharacterSprite seat={1} flipped id="p2-char-img" wrapId="p2-char-wrap" />
          <CounterBar />
        </div>
      </div>
    </div>
  );
}
