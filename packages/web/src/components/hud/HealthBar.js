import { jsx as _jsx } from "react/jsx-runtime";
import { STARTING_HEALTH } from '@sudoku-fighting/shared';
export default function HealthBar({ hp, side, id }) {
    const pct = Math.max(0, Math.min(100, (hp / STARTING_HEALTH) * 100));
    const cls = pct <= 30 ? 'low' : pct <= 60 ? 'mid' : '';
    return (_jsx("div", { className: `hud-bar-track ${side}`, children: _jsx("div", { id: id, className: `hud-bar${cls ? ' ' + cls : ''}`, style: { width: `${pct}%` } }) }));
}
