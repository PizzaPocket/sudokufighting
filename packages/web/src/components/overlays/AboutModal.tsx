import { useGameStore } from '../../store/gameStore';
import { useModalAnimation } from '../../hooks/useModalAnimation';
import { CREDITS } from '../../creditsContent';

export default function AboutModal() {
  const open = useGameStore(s => s.aboutOpen);
  const setAboutOpen = useGameStore(s => s.setAboutOpen);
  const { rendered, closing } = useModalAnimation(open);

  if (!rendered) return null;

  return (
    <div className="modal-overlay" onPointerDown={() => setAboutOpen(false)}>
      <div className={`modal-sheet${closing ? ' closing' : ''}`} onPointerDown={e => e.stopPropagation()}>

        <div className="modal-sheet-header">
          <div className="modal-sheet-back" />
          <span className="modal-sheet-title">ABOUT</span>
          <button
            className="btn-utility header-icon-btn modal-sheet-close"
            onClick={() => setAboutOpen(false)}
            aria-label="Close"
          >
            <img src="/assets/ui/icon-close.svg" className="header-icon-img" alt="" />
          </button>
        </div>

        <div className="modal-sheet-body about-body">
          {CREDITS.map((line, i) => {
            if (line.type === 'logo') return (
              <div key={i} className="about-logo">
                <img src="/assets/ui/Logo1_Sudoku.svg" alt="Sudoku" />
                <img src="/assets/ui/Logo2_Fighting.svg" alt="Fighting" />
              </div>
            );
            if (line.type === 'spacer') return <div key={i} className="about-spacer" />;
            if (line.type === 'name')   return <p key={i} className="about-name">{line.text}</p>;
            return <p key={i} className="about-body-text">{line.text}</p>;
          })}
        </div>

      </div>
    </div>
  );
}
