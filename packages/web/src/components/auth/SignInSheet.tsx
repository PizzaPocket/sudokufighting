import { useState } from 'react';
import { useAuthStore } from '../../auth/authStore';
import { signIn, signInWithGoogle, signInWithApple, isAppleSignInAvailable } from '../../auth/authService';
import { useModalAnimation } from '../../hooks/useModalAnimation';


export default function SignInSheet() {
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
      setError('Please enter your email and password.');
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
          <span className="modal-sheet-title">SIGN IN</span>
          <button
            className="btn-utility header-icon-btn modal-sheet-close"
            onClick={handleClose}
            aria-label="Close"
          >
            <img src="/assets/ui/icon-close.svg" className="header-icon-img" alt="" />
          </button>
        </div>

        <div className="modal-sheet-body">
          <p className="modal-sheet-value-prop">Save your progress and achievements</p>
          <input
            className="auth-field"
            type="email"
            placeholder="Email"
            value={email}
            autoComplete="email"
            onChange={e => { setEmail(e.target.value); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleSignIn()}
          />
          <input
            className="auth-field"
            type="password"
            placeholder="Password"
            value={password}
            autoComplete="current-password"
            onChange={e => { setPassword(e.target.value); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleSignIn()}
          />

          <button className="auth-link" style={{ fontSize: 'var(--text-sm)', textAlign: 'right', marginTop: '-4px' }} onClick={switchToForgotPassword}>
            Forgot password?
          </button>

          <p className={`auth-error${error ? ' visible' : ''}`}>{error || '\u00A0'}</p>

          <button
            className="btn"
            style={{ width: '100%' }}
            onClick={handleSignIn}
            disabled={loading}
          >
            {loading ? 'SIGNING IN...' : 'SIGN IN'}
          </button>

          <div className="auth-divider"><span>or</span></div>

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
            Continue with Google
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
              Continue with Apple
            </button>
          )}

          <button className="auth-link" onClick={handleCreateAccount}>
            Create an Account
          </button>
        </div>

      </div>
    </div>
  );
}
