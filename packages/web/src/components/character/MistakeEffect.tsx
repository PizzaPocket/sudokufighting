import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../store/gameStore';

const FRAMES = 4;
const FRAME_DURATION_MS = 150;

interface Props {
  seat: 0 | 1;
}

export default function MistakeEffect({ seat }: Props) {
  const signal = useGameStore(s => seat === 0 ? s.p1MistakeSignal : s.p2MistakeSignal);
  const [frame, setFrame] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!signal) return;
    if (timerRef.current) clearTimeout(timerRef.current);

    setFrame(1);
    let f = 1;

    function advance() {
      f++;
      if (f > FRAMES) {
        setFrame(null);
        return;
      }
      setFrame(f);
      timerRef.current = setTimeout(advance, FRAME_DURATION_MS);
    }

    timerRef.current = setTimeout(advance, FRAME_DURATION_MS);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [signal?.nonce]);

  if (frame === null) return null;

  return (
    <img
      className="mistake-effect"
      src={`/assets/shared/mistake_frame${frame}.svg`}
      alt=""
    />
  );
}
