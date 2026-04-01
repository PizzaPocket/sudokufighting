import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { AnimationController, preloadCharacterSprites } from '../../hooks/useAnimation';
export default function CharacterSprite({ seat, flipped, id, wrapId }) {
    const imgRef = useRef(null);
    const controllerRef = useRef(null);
    const signal = useGameStore(s => seat === 0 ? s.p1AnimSignal : s.p2AnimSignal);
    // Derive characterId from mySeat + myCharacter / opponentCharacter
    const mySeat = useGameStore(s => s.mySeat);
    const myCharacter = useGameStore(s => s.myCharacter);
    const opponentCharacter = useGameStore(s => s.opponentCharacter);
    const myUseAlt = useGameStore(s => s.myUseAlt);
    const opponentUseAlt = useGameStore(s => s.opponentUseAlt);
    const characters = useGameStore(s => s.characters);
    function resolveCharId(s) {
        const isMe = s === mySeat;
        const charId = isMe ? myCharacter : opponentCharacter;
        const useAlt = isMe ? myUseAlt : opponentUseAlt;
        if (!charId)
            return null;
        if (!useAlt)
            return charId;
        const char = characters.find(c => c.id === charId);
        return char?.altId ?? charId;
    }
    const resolvedCharId = resolveCharId(seat);
    // Initialize or swap controller when character changes
    useEffect(() => {
        if (!resolvedCharId || !imgRef.current)
            return;
        preloadCharacterSprites(resolvedCharId);
        if (!controllerRef.current) {
            controllerRef.current = new AnimationController(resolvedCharId, imgRef.current);
        }
        else {
            controllerRef.current.setCharacter(resolvedCharId);
            controllerRef.current.setImage(imgRef.current);
        }
        controllerRef.current.reset();
    }, [resolvedCharId]);
    // Respond to animation signals; null signal resets to idle (e.g. between rounds)
    useEffect(() => {
        if (!controllerRef.current)
            return;
        if (!signal) {
            controllerRef.current.reset(); // clears priority, returns to idle
            return;
        }
        controllerRef.current.play(signal.state);
    }, [signal?.state, signal?.nonce]);
    if (!resolvedCharId)
        return null;
    return (_jsx("div", { id: wrapId, className: `character-wrap${flipped ? ' flipped' : ''}`, children: _jsx("img", { id: id, ref: imgRef, className: "character-sprite", alt: "", src: `/characters/${resolvedCharId}/idle_frame1.svg` }) }));
}
