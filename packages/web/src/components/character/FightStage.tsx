import React from 'react';
import CharacterSprite from './CharacterSprite';

export default function FightStage() {
  return (
    <div id="fight-stage">
      <div className="fight-characters">
        <CharacterSprite seat={0} id="p1-char-img" wrapId="p1-char-wrap" />
        <CharacterSprite seat={1} flipped id="p2-char-img" wrapId="p2-char-wrap" />
      </div>
    </div>
  );
}
