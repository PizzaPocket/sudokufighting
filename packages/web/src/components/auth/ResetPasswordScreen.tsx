import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../auth/authStore';
import { updatePassword } from '../../auth/authService';

export default function ResetPasswordScreen() {
  const { t } = useTranslation('ui');
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
      setMessage(t('auth.enter_new_password'));
      return;
    }
    if (password.length < 8) {
      setMessage(t('auth.password_too_short'));
      return;
    }
    if (password !== confirm) {
      setMessage(t('auth.passwords_no_match'));
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
        setMessage(t('auth.password_updated'));
        setTimeout(() => setResetPasswordMode(false), 2000);
      }
    } catch {
      setMessage(t('auth.something_wrong'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div className="modal-sheet" onPointerDown={e => e.stopPropagation()}>

        <div className="modal-sheet-header">
          <div className="modal-sheet-back" />
          <span className="modal-sheet-title">{t('auth.set_new_password_title')}</span>
          <div className="modal-sheet-close" />
        </div>

        <div className="modal-sheet-body">
          <p className="modal-sheet-value-prop">{t('auth.set_new_password_desc')}</p>
          <input
            className="auth-field"
            type="password"
            placeholder={t('auth.new_password')}
            value={password}
            autoComplete="new-password"
            onChange={e => { setPassword(e.target.value); setMessage(''); }}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            disabled={isSuccess}
          />
          <input
            className="auth-field"
            type="password"
            placeholder={t('auth.confirm_new_password')}
            value={confirm}
            autoComplete="new-password"
            onChange={e => { setConfirm(e.target.value); setMessage(''); }}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            disabled={isSuccess}
          />

          <p className={`auth-error${message ? ' visible' : ''}${isSuccess ? ' success' : ''}`}>
            {message || ' '}
          </p>

          <button
            className="btn"
            style={{ width: '100%' }}
            onClick={handleSubmit}
            disabled={loading || isSuccess}
          >
            {loading ? t('auth.saving') : t('auth.update_password')}
          </button>
        </div>

      </div>
    </div>
  );
}
