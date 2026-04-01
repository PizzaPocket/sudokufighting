import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import CharacterSprite from './CharacterSprite';
export default function FightStage() {
    return (_jsx("div", { id: "fight-stage", children: _jsxs("div", { className: "fight-characters", children: [_jsx(CharacterSprite, { seat: 0, id: "p1-char-img", wrapId: "p1-char-wrap" }), _jsx(CharacterSprite, { seat: 1, flipped: true, id: "p2-char-img", wrapId: "p2-char-wrap" })] }) }));
}
