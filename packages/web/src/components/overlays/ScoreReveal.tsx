import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  rawScore: number;
  finalScore: number;
  isFlawless: boolean;
  onGlow?: () => void;
}

export default function ScoreReveal({ rawScore, finalScore, isFlawless, onGlow }: Props) {
  const { t } = useTranslation('ui');
  const [displayed, setDisplayed] = useState(rawScore);
  const rafRef = useRef<number | null>(null);
  const firedRef = useRef(false);
  const displayedRef = useRef(rawScore);
  const crossedRef = useRef(false);
  const onGlowRef = useRef(onGlow);
  onGlowRef.current = onGlow;

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    displayedRef.current = rawScore;
    setDisplayed(rawScore);
    crossedRef.current = false;

    if (rawScore === finalScore) return;

    const target = finalScore;

    function animate() {
      const diff = target - displayedRef.current;
      if (Math.abs(diff) < 1) {
        displayedRef.current = target;
        setDisplayed(target);
        if (isFlawless && !crossedRef.current) {
          crossedRef.current = true;
          onGlowRef.current?.();
        }
        rafRef.current = null;
        return;
      }
      const next = Math.round(displayedRef.current + diff * 0.05);
      displayedRef.current = next;
      setDisplayed(next);

      if (isFlawless && !crossedRef.current && next > rawScore) {
        crossedRef.current = true;
        onGlowRef.current?.();
      }

      rafRef.current = requestAnimationFrame(animate);
    }

    const timeout = setTimeout(() => {
      rafRef.current = requestAnimationFrame(animate);
    }, 300);

    return () => {
      clearTimeout(timeout);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <span>{displayed.toLocaleString()} {t('common.pts')}</span>;
}
