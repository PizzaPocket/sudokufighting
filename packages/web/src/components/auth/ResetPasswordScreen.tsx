import { useState } from 'react';
import { useAuthStore } from '../../auth/authStore';
import { updatePassword } from '../../auth/authService';

export default function ResetPasswordScreen() {
  const resetPasswordMode = useAuthStore(s => s.resetPasswordMode);
  const setResetPasswordMode = useAuthStore(s => s.setResetPasswordMode);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!resetPasswordMode) return null;

  async function handleSubmit() {
    if (!password) {
      setMessage('Please enter a new password.');
      return;
    }
    if (password.length < 8) {
      setMessage('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setMessage('Passwords do not match.');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const err = await updatePassword(password);
      if (err) {
        setMessage(err);
      } else {
        setIsSuccess(true);
        setMessage('Password updated! You\'re now signed in.');
        setTimeout(() => setResetPasswordMode(false), 2000);
      }
    } catch {
      setMessage('Something went wrong — please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div className="modal-sheet" onPointerDown={e => e.stopPropagation()}>

        <div className="modal-sheet-header">
          <div className="modal-sheet-back" />
          <span className="modal-sheet-title">SET NEW PASSWORD</span>
          <div className="modal-sheet-close" />
        </div>

        <div className="modal-sheet-body">
          <p className="modal-sheet-value-prop">Choose a new password for your account</p>
          <input
            className="auth-field"
            type="password"
            placeholder="New password"
            value={password}
            autoComplete="new-password"
            onChange={e => { setPassword(e.target.value); setMessage(''); }}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            disabled={isSuccess}
          />
          <input
            className="auth-field"
            type="password"
            placeholder="Confirm new password"
            value={confirm}
            autoComplete="new-password"
            onChange={e => { setConfirm(e.target.value); setMessage(''); }}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            disabled={isSuccess}
          />

          <p className={`auth-error${message ? ' visible' : ''}${isSuccess ? ' success' : ''}`}>
            {message || '\u00A0'}
          </p>

          <button
            className="btn"
            style={{ width: '100%' }}
            onClick={handleSubmit}
            disabled={loading || isSuccess}
          >
            {loading ? 'SAVING...' : 'UPDATE PASSWORD'}
          </button>
        </div>

      </div>
    </div>
  );
}
