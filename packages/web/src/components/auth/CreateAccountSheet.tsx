import { useState } from 'react';
import { useAuthStore } from '../../auth/authStore';
import { createAccount, signInWithGoogle, signInWithApple, isAppleSignInAvailable } from '../../auth/authService';
import { useModalAnimation } from '../../hooks/useModalAnimation';

export default function CreateAccountSheet() {
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
      setError('Please enter your email and password.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    setError('');
    const err = await createAccount(email.trim(), password);
    setLoading(false);
    if (err) setError(err);
    // On success, useAuthInit closes the sheet via closeAll()
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
          <span className="modal-sheet-title">CREATE ACCOUNT</span>
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
            onKeyDown={e => e.key === 'Enter' && handleCreateAccount()}
          />
          <input
            className="auth-field"
            type="password"
            placeholder="Password"
            value={password}
            autoComplete="new-password"
            onChange={e => { setPassword(e.target.value); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleCreateAccount()}
          />
          <input
            className="auth-field"
            type="password"
            placeholder="Confirm password"
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
            {loading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
          </button>

          <div className="auth-divider"><span>or</span></div>

          <button className="btn-social btn-social-google" onClick={signInWithGoogle}>
            <img src="/assets/ui/icon-google.svg" className="btn-social-icon" alt="" />
            Continue with Google
          </button>
          {isAppleSignInAvailable() && (
            <button className="btn-social btn-social-apple" onClick={async () => {
              setLoading(true);
              const err = await signInWithApple();
              setLoading(false);
              if (err) setError(err);
            }}>
              <img src="/assets/ui/icon-apple.svg" className="btn-social-icon" alt="" />
              Continue with Apple
            </button>
          )}

        </div>

      </div>
    </div>
  );
}
