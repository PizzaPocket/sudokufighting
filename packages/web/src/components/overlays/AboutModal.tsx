import { useGameStore } from '../../store/gameStore';
import { useModalAnimation } from '../../hooks/useModalAnimation';

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
          <p className="about-body-text">
            Sudoku Fighting is a passion project by the parent-and-kid developer duo <strong>Leonard Downs Reese IV</strong> and <strong>Kaius Lu Reese</strong>. Character design, creative direction, and musical contribution by Kaius. Game design, programming, and original soundtrack by Leonard.
          </p>
          <p className="about-body-text">
            Special thanks to <strong>Tingting Lu</strong> for your love and support, and for putting up so much with two obsessive maniacs in your home. We love you.
          </p>
          <p className="about-copyright">© 2026 Leonard Downs Reese IV and Kaius Lu Reese. All rights reserved.</p>
        </div>

      </div>
    </div>
  );
}
