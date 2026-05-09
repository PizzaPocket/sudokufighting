import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../auth/authStore';
import { createAccount, signInWithGoogle, signInWithApple, isAppleSignInAvailable } from '../../auth/authService';
import { useModalAnimation } from '../../hooks/useModalAnimation';
import { showToast } from '../../toasts/toastStore';

export default function CreateAccountSheet() {
  const { t } = useTranslation('ui');
  const createAccountOpen = useAuthStore(s => s.createAccountOpen);
  const switching = useAuthStore(s => s.switching);
  const closeAll = useAuthStore(s => s.closeAll);
  const switchToSignIn = useAuthStore(s => s.switchToSignIn);

  const { rendered, closing } = useModalAnimation(createAccountOpen, switching);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!rendered) return null;

  function resetForm() {
    setEmail('');
    setPassword('');
    setConfirm('');
    setError('');
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

  async function handleCreateAccount() {
    if (!email.trim() || !password) {
      setError(t('auth.enter_email_password'));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError(t('auth.enter_valid_email'));
      return;
    }
    if (password.length < 8) {
      setError(t('auth.password_too_short'));
      return;
    }
    if (password !== confirm) {
      setError(t('auth.passwords_no_match'));
      return;
    }
    setLoading(true);
    setError('');
    const err = await createAccount(email.trim(), password);
    setLoading(false);
    if (err) { setError(err); return; }
    showToast(t('auth.account_created'), 'default');
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
          <span className="modal-sheet-title">{t('auth.create_account_title')}</span>
          <button
            className="btn-utility header-icon-btn modal-sheet-close"
            onClick={handleClose}
            aria-label="Close"
          >
            <img src="/assets/ui/icon-close.svg" className="header-icon-img" alt="" />
          </button>
        </div>

        <div className="modal-sheet-body">
          <p className="modal-sheet-value-prop">{t('auth.save_progress')}</p>
          <input
            className="auth-field"
            type="email"
            placeholder={t('auth.email')}
            value={email}
            autoComplete="email"
            onChange={e => { setEmail(e.target.value); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleCreateAccount()}
          />
          <input
            className="auth-field"
            type="password"
            placeholder={t('auth.password')}
            value={password}
            autoComplete="new-password"
            onChange={e => { setPassword(e.target.value); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleCreateAccount()}
          />
          <input
            className="auth-field"
            type="password"
            placeholder={t('auth.confirm_password')}
            value={confirm}
            autoComplete="new-password"
            onChange={e => { setConfirm(e.target.value); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleCreateAccount()}
          />

          <p className={`auth-error${error ? ' visible' : ''}`}>{error || '\u00A0'}</p>

          <button
            className="btn"
            style={{ width: '100%' }}
            onClick={handleCreateAccount}
            disabled={loading}
          >
            {loading ? t('auth.creating_account') : t('auth.create_account_title')}
          </button>

          <div className="auth-divider"><span>{t('auth.or')}</span></div>

          <button className="btn-social btn-social-google" onClick={async () => {
              setLoading(true);
              const err = await signInWithGoogle();
              setLoading(false);
              if (err) setError(err);
            }}>
            <img src="/assets/ui/icon-google.svg" className="btn-social-icon" alt="" />
            {t('auth.continue_google')}
          </button>
          {isAppleSignInAvailable() && (
            <button className="btn-social btn-social-apple" onClick={async () => {
              setLoading(true);
              const err = await signInWithApple();
              setLoading(false);
              if (err) setError(err);
            }}>
              <img src="/assets/ui/icon-apple.svg" className="btn-social-icon" alt="" />
              {t('auth.continue_apple')}
            </button>
          )}

        </div>

      </div>
    </div>
  );
}
