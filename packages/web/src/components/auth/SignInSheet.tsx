import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../auth/authStore';
import { signIn, signInWithGoogle, signInWithApple, isAppleSignInAvailable } from '../../auth/authService';
import { useModalAnimation } from '../../hooks/useModalAnimation';


export default function SignInSheet() {
  const { t } = useTranslation('ui');
  const signInOpen = useAuthStore(s => s.signInOpen);
  const switching = useAuthStore(s => s.switching);
  const closeAll = useAuthStore(s => s.closeAll);
  const switchToCreateAccount = useAuthStore(s => s.switchToCreateAccount);
  const switchToForgotPassword = useAuthStore(s => s.switchToForgotPassword);
  const oauthError = useAuthStore(s => s.oauthError);
  const setOauthError = useAuthStore(s => s.setOauthError);

  const { rendered, closing } = useModalAnimation(signInOpen, switching);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!rendered) return null;

  function resetForm() {
    setEmail('');
    setPassword('');
    setError('');
    setLoading(false);
  }

  function handleClose() {
    resetForm();
    closeAll();
  }

  function handleCreateAccount() {
    resetForm();
    switchToCreateAccount();
  }

  async function handleSignIn() {
    if (!email.trim() || !password) {
      setError(t('auth.enter_email_password'));
      return;
    }
    setLoading(true);
    setError('');
    const err = await signIn(email.trim(), password);
    setLoading(false);
    if (err) setError(err);
    // On success, useAuthInit closes the sheet via closeAll()
  }

  return (
    <div className={`modal-overlay${closing && !switching ? ' closing' : ''}`} onPointerDown={handleClose}>
      <div className={`modal-sheet${closing && !switching ? ' closing' : ''}${switching ? ' instant' : ''}`} onPointerDown={e => e.stopPropagation()}>
        <div className="modal-sheet-header">
          {/* Left spacer balances the close button so title stays centred */}
          <div className="modal-sheet-back" />
          <span className="modal-sheet-title">{t('auth.sign_in_title')}</span>
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
            onKeyDown={e => e.key === 'Enter' && handleSignIn()}
          />
          <input
            className="auth-field"
            type="password"
            placeholder={t('auth.password')}
            value={password}
            autoComplete="current-password"
            onChange={e => { setPassword(e.target.value); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleSignIn()}
          />

          <button className="auth-link" style={{ fontSize: 'var(--text-sm)', textAlign: 'right', marginTop: '-4px' }} onClick={switchToForgotPassword}>
            {t('auth.forgot_password')}
          </button>

          <p className={`auth-error${error ? ' visible' : ''}`}>{error || '\u00A0'}</p>

          <button
            className="btn"
            style={{ width: '100%' }}
            onClick={handleSignIn}
            disabled={loading}
          >
            {loading ? t('auth.signing_in') : t('auth.sign_in_title')}
          </button>

          <div className="auth-divider"><span>{t('auth.or')}</span></div>

          {oauthError && (
            <p className="auth-error visible" style={{ marginBottom: '8px' }} onClick={() => setOauthError(null)}>
              {oauthError}
            </p>
          )}

          <button className="btn-social btn-social-google" onClick={async () => {
              setOauthError(null);
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
              setOauthError(null);
              setLoading(true);
              const err = await signInWithApple();
              setLoading(false);
              if (err) setError(err);
            }}>
              <img src="/assets/ui/icon-apple.svg" className="btn-social-icon" alt="" />
              {t('auth.continue_apple')}
            </button>
          )}

          <button className="auth-link" onClick={handleCreateAccount}>
            {t('auth.create_account')}
          </button>
        </div>

      </div>
    </div>
  );
}
