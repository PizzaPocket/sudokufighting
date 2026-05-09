import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { useModalAnimation } from '../../hooks/useModalAnimation';

export default function AboutModal() {
  const { t } = useTranslation('ui');
  const open = useGameStore(s => s.aboutOpen);
  const setAboutOpen = useGameStore(s => s.setAboutOpen);
  const { rendered, closing } = useModalAnimation(open);

  if (!rendered) return null;

  return (
    <div className="modal-overlay" onPointerDown={() => setAboutOpen(false)}>
      <div className={`modal-sheet${closing ? ' closing' : ''}`} onPointerDown={e => e.stopPropagation()}>
        <div className="modal-sheet-header">
          <div className="modal-sheet-back" />
          <span className="modal-sheet-title">{t('settings.about')}</span>
          <button
            className="btn-utility header-icon-btn modal-sheet-close"
            onClick={() => setAboutOpen(false)}
            aria-label="Close"
          >
            <img src="/assets/ui/icon-close.svg" className="header-icon-img" alt="" />
          </button>
        </div>

        <div className="modal-sheet-body about-body">
          <p className="about-body-text" dangerouslySetInnerHTML={{ __html: t('about.para1') }} />
          <p className="about-body-text" dangerouslySetInnerHTML={{ __html: t('about.para2') }} />
          <p className="about-copyright">© 2026 Leonard Downs Reese IV and Kaius Lu Reese. All rights reserved.</p>
        </div>

      </div>
    </div>
  );
}
