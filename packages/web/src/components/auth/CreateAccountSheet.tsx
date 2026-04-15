import { useState } from 'react';
import { useAuthStore } from '../../auth/authStore';
import { createAccount, signInWithGoogle, signInWithApple } from '../../auth/authService';

export default function CreateAccountSheet() {
  const createAccountOpen = useAuthStore(s => s.createAccountOpen);
  const closeAll = useAuthStore(s => s.closeAll);
  const openSignIn = useAuthStore(s => s.openSignIn);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!createAccountOpen) return null;

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
    openSignIn();
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
    <div className="modal-overlay" onPointerDown={handleClose}>
      <div className="modal-sheet" onPointerDown={e => e.stopPropagation()}>

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

          <button className="btn-social" onClick={signInWithGoogle}>
            Continue with Google
          </button>
          {/* Apple Sign-In: shown on iOS in Capacitor phase */}

        </div>

      </div>
    </div>
  );
}
