import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../auth/authStore';
import { resetPassword } from '../../auth/authService';
import { useModalAnimation } from '../../hooks/useModalAnimation';

export default function ForgotPasswordSheet() {
  const { t } = useTranslation('ui');
  const forgotPasswordOpen = useAuthStore(s => s.forgotPasswordOpen);
  const switching = useAuthStore(s => s.switching);
  const closeAll = useAuthStore(s => s.closeAll);
  const switchToSignIn = useAuthStore(s => s.switchToSignIn);

  const { rendered, closing } = useModalAnimation(forgotPasswordOpen, switching);

  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!rendered) return null;

  function resetForm() {
    setEmail('');
    setMessage('');
    setIsSuccess(false);
    setLoading(false);
  }

  function handleClose() {
    resetForm();
    closeAll();
  }

  function handleBack() {
    resetForm();
    switchToSignIn();
  }

  async function handleSend() {
    if (!email.trim()) {
      setMessage(t('auth.enter_email'));
      setIsSuccess(false);
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setMessage(t('auth.enter_valid_email'));
      setIsSuccess(false);
      return;
    }
    setLoading(true);
    setMessage('');
    const err = await resetPassword(email.trim());
    setLoading(false);
    if (err) {
      setMessage(err);
      setIsSuccess(false);
    } else {
      setMessage(t('auth.reset_link_sent'));
      setIsSuccess(true);
    }
  }

  return (
    <div className={`modal-overlay${closing && !switching ? ' closing' : ''}`} onPointerDown={handleClose}>
      <div className={`modal-sheet${closing && !switching ? ' closing' : ''}${switching ? ' instant' : ''}`} onPointerDown={e => e.stopPropagation()}>
        <div className="modal-sheet-header">
          <button
            className="btn-utility header-icon-btn modal-sheet-back"
            onClick={handleBack}
            aria-label="Back"
          >
            <img src="/assets/ui/chevron-left.svg" className="header-icon-img" alt="" />
          </button>
          <span className="modal-sheet-title">{t('auth.reset_password_title')}</span>
          <button
            className="btn-utility header-icon-btn modal-sheet-close"
            onClick={handleClose}
            aria-label="Close"
          >
            <img src="/assets/ui/icon-close.svg" className="header-icon-img" alt="" />
          </button>
        </div>

        <div className="modal-sheet-body">
          <p className="modal-sheet-value-prop">{t('auth.reset_password_desc')}</p>
          <input
            className="auth-field"
            type="email"
            placeholder={t('auth.email')}
            value={email}
            autoComplete="email"
            onChange={e => { setEmail(e.target.value); setMessage(''); setIsSuccess(false); }}
            onKeyDown={e => e.key === 'Enter' && !isSuccess && handleSend()}
            disabled={isSuccess}
          />

          <p className={`auth-error${message ? ' visible' : ''}${isSuccess ? ' success' : ''}`}>
            {message || ' '}
          </p>

          <button
            className="btn"
            style={{ width: '100%' }}
            onClick={handleSend}
            disabled={loading || isSuccess}
          >
            {loading ? t('auth.sending') : t('auth.send_reset_link')}
          </button>
        </div>

      </div>
    </div>
  );
}
