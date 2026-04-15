import { useState } from 'react';
import { useAuthStore } from '../../auth/authStore';
import { signIn, signInWithGoogle, signInWithApple } from '../../auth/authService';

export default function SignInSheet() {
  const signInOpen = useAuthStore(s => s.signInOpen);
  const closeAll = useAuthStore(s => s.closeAll);
  const openCreateAccount = useAuthStore(s => s.openCreateAccount);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!signInOpen) return null;

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
    openCreateAccount();
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
    <div className="modal-overlay" onPointerDown={handleClose}>
      <div className="modal-sheet" onPointerDown={e => e.stopPropagation()}>

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

          <button className="btn-social" onClick={signInWithGoogle}>
            Continue with Google
          </button>
          {/* Apple Sign-In: shown on iOS in Capacitor phase */}

          <button className="auth-link" onClick={handleCreateAccount}>
            Create an Account
          </button>
        </div>

      </div>
    </div>
  );
}
