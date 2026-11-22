import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useStore } from '../store';
import { accountCopy } from '../accountCopy';

export default function AccountSettings({ security = false }) {
  const { user, language, updateProfile, signOut, flash } = useStore();
  const c = accountCopy[language] || accountCopy.pl;
  const [form, setForm] = useState(() => Object.fromEntries(Object.keys(c.fields).map((key) => [key, user[key] || ''])));
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const submit = async (event) => {
    event.preventDefault();
    if (security && passwords.newPassword !== passwords.confirm) return setError(c.mismatch);
    setBusy(true); setError('');
    try {
      if (security) {
        await api('/auth/password', { method: 'POST', body: JSON.stringify(passwords) });
        signOut(); flash(c.passwordSaved); navigate('/auth', { replace: true });
      } else {
        const result = await api('/auth/me', { method: 'PATCH', body: JSON.stringify(form) });
        updateProfile(result.user); flash(c.saved);
      }
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  return <section className="account-section account-settings">
    <span className="section-label">NASHARY ID / {security ? 'SECURITY' : 'PROFILE'}</span>
    <h2>{security ? c.security : c.profile}</h2><p>{security ? c.passwordHint : c.private}</p>
    <form onSubmit={submit}>
      {security ? [['currentPassword', c.current], ['newPassword', c.next], ['confirm', c.confirm]].map(([key, label]) => <label key={key}>{label}<input type="password" autoComplete={key === 'currentPassword' ? 'current-password' : 'new-password'} required minLength={key === 'currentPassword' ? 1 : 8} value={passwords[key]} onChange={(e) => setPasswords({ ...passwords, [key]: e.target.value })} /></label>) :
        Object.entries(c.fields).map(([key, label]) => <label key={key}>{label}<input type={key === 'email' ? 'email' : key === 'phone' ? 'tel' : 'text'} autoComplete={{displayName: 'name', email: 'email', phone: 'tel', city: 'address-level2', address: 'street-address'}[key]} maxLength={{displayName: 80, email: 254, phone: 30, city: 80, address: 200}[key]} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></label>)}
      {error && <p role="alert" className="form-error">{error}</p>}
      <button type="submit" disabled={busy} className="primary-button">{busy ? c.loading : security ? c.password : c.save}</button>
    </form>
  </section>;
}
