import { useEffect, useRef, useState } from 'react';

interface Props {
  rawScore: number;
  finalScore: number;
  isFlawless: boolean;
}

export default function ScoreReveal({ rawScore, finalScore, isFlawless }: Props) {
  const [displayed, setDisplayed] = useState(rawScore);
  const [glowing, setGlowing] = useState(false);
  const rafRef = useRef<number | null>(null);
  const firedRef = useRef(false);
  const displayedRef = useRef(rawScore);
  const crossedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    displayedRef.current = rawScore;
    setDisplayed(rawScore);
    crossedRef.current = false;

    if (rawScore === finalScore) return;

    const targetRef = { current: finalScore };

    function animate() {
      const diff = targetRef.current - displayedRef.current;
      if (Math.abs(diff) < 1) {
        displayedRef.current = targetRef.current;
        setDisplayed(targetRef.current);
        if (isFlawless) setGlowing(true);
        rafRef.current = null;
        return;
      }
      const next = Math.round(displayedRef.current + diff * 0.05);
      displayedRef.current = next;
      setDisplayed(next);

      // Trigger glow the moment we cross rawScore (multiplier starts applying)
      if (isFlawless && !crossedRef.current && next > rawScore) {
        crossedRef.current = true;
        setGlowing(true);
      }

      rafRef.current = requestAnimationFrame(animate);
    }

    // Small delay so the animation starts after the overlay has settled
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

  return (
    <div className={`score-reveal${glowing ? ' score-reveal--flawless' : ''}`}>
      {displayed.toLocaleString()} PTS
    </div>
  );
}
