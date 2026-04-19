import { useState } from 'react';
import { useAuthStore } from '../../auth/authStore';
import { resetPassword } from '../../auth/authService';
import { useModalAnimation } from '../../hooks/useModalAnimation';

export default function ForgotPasswordSheet() {
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
      setMessage('Please enter your email address.');
      setIsSuccess(false);
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setMessage('Please enter a valid email address.');
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
      setMessage('Check your email — we sent a reset link.');
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
          <span className="modal-sheet-title">RESET PASSWORD</span>
          <button
            className="btn-utility header-icon-btn modal-sheet-close"
            onClick={handleClose}
            aria-label="Close"
          >
            <img src="/assets/ui/icon-close.svg" className="header-icon-img" alt="" />
          </button>
        </div>

        <div className="modal-sheet-body">
          <p className="modal-sheet-value-prop">Enter your email and we'll send a reset link</p>
          <input
            className="auth-field"
            type="email"
            placeholder="Email"
            value={email}
            autoComplete="email"
            onChange={e => { setEmail(e.target.value); setMessage(''); setIsSuccess(false); }}
            onKeyDown={e => e.key === 'Enter' && !isSuccess && handleSend()}
            disabled={isSuccess}
          />

          <p className={`auth-error${message ? ' visible' : ''}${isSuccess ? ' success' : ''}`}>
            {message || '\u00A0'}
          </p>

          <button
            className="btn"
            style={{ width: '100%' }}
            onClick={handleSend}
            disabled={loading || isSuccess}
          >
            {loading ? 'SENDING...' : 'SEND RESET LINK'}
          </button>
        </div>

      </div>
    </div>
  );
}
