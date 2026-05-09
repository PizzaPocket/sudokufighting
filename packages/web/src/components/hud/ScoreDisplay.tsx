import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';

interface Props {
  seat: 0 | 1;
  id: string;
}

export default function ScoreDisplay({ seat, id }: Props) {
  const { t } = useTranslation('ui');
  const score = useGameStore(s => s.score[seat]);
  const scoreFightOffset = useGameStore(s => s.scoreFightOffset[seat]);
  const perFightScore = score - scoreFightOffset;

  const [displayed, setDisplayed] = useState(0);
  const rafRef = useRef<number | null>(null);
  const targetRef = useRef(0);
  const displayedRef = useRef(0);

  useEffect(() => {
    targetRef.current = perFightScore;

    // New fight started — reset instantly instead of animating backward
    if (displayedRef.current > perFightScore) {
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      displayedRef.current = 0;
      setDisplayed(0);
      return;
    }

    if (rafRef.current) return;

    function animate() {
      const diff = targetRef.current - displayedRef.current;
      if (Math.abs(diff) < 1) {
        displayedRef.current = targetRef.current;
        setDisplayed(targetRef.current);
        rafRef.current = null;
        return;
      }
      const next = Math.round(displayedRef.current + diff * 0.07);
      displayedRef.current = next;
      setDisplayed(next);
      rafRef.current = requestAnimationFrame(animate);
    }

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [perFightScore]);

  return (
    <span className="hud-score" id={id}>
      {displayed} {t('common.pts')}
    </span>
  );
}
