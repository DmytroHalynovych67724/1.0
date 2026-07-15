import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import { api } from '../api';
import { useStore } from '../store';

const words = {
  pl: {
    mismatch: 'Hasła nie są identyczne.',
    welcome: 'Miło Cię widzieć',
    create: 'Załóż konto',
    lead: 'Jedno konto do zakupów, sprzedaży, czatów i osobistych promokodów.',
    password: 'Hasło',
    repeat: 'Powtórz hasło',
    back: 'Wróć na stronę główną',
    tagline: 'sprzęt, ceny i okazje',
  },
  uk: {
    mismatch: 'Паролі не збігаються.',
    welcome: 'Раді вас бачити',
    create: 'Створіть акаунт',
    lead: 'Один акаунт для покупок, продажу, чатів і персональних промокодів.',
    password: 'Пароль',
    repeat: 'Повторіть пароль',
    back: 'На головну',
    tagline: 'техніка, ціни та вигода',
  },
  en: {
    mismatch: 'The passwords do not match.',
    welcome: 'Good to see you',
    create: 'Create an account',
    lead: 'One account for shopping, selling, chats and personal promo codes.',
    password: 'Password',
    repeat: 'Repeat password',
    back: 'Back to home',
    tagline: 'devices, prices and deals',
  },
};

export default function Auth() {
  const { t, signIn, language } = useStore();
  const c = words[language] || words.pl;
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ username: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (mode === 'register' && form.password !== form.confirm) return setError(c.mismatch);
    setBusy(true);
    try {
      if (mode === 'register')
        await api('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ username: form.username, password: form.password }),
        });
      const payload = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: form.username, password: form.password }),
      });
      signIn(payload.token, payload.user);
      navigate(location.state?.from || '/account');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="auth-react">
      <div className="auth-react__brand">
        <Logo />
      </div>
      <div className="auth-card-react">
        <div className="auth-tabs-react">
          <button
            className={mode === 'login' ? 'is-active' : ''}
            type="button"
            onClick={() => setMode('login')}
          >
            {t('login')}
          </button>
          <button
            className={mode === 'register' ? 'is-active' : ''}
            type="button"
            onClick={() => setMode('register')}
          >
            {t('register')}
          </button>
        </div>
        <span className="section-label">NaShary ID</span>
        <h1>{mode === 'login' ? c.welcome : c.create}</h1>
        <p>{c.lead}</p>
        <form onSubmit={submit}>
          <label>
            Login
            <input
              required
              minLength="3"
              value={form.username}
              onChange={(event) => setForm({ ...form, username: event.target.value })}
            />
          </label>
          <label>
            {c.password}
            <input
              required
              minLength="8"
              type="password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
            />
          </label>
          {mode === 'register' && (
            <label>
              {c.repeat}
              <input
                required
                type="password"
                value={form.confirm}
                onChange={(event) => setForm({ ...form, confirm: event.target.value })}
              />
            </label>
          )}
          {error && <div className="form-error">{error}</div>}
          <button className="primary-button primary-button--wide" disabled={busy} type="submit">
            {busy ? '…' : mode === 'login' ? t('login') : t('register')}
          </button>
        </form>
        <Link to="/">← {c.back}</Link>
      </div>
      <div className="auth-react__aside">
        <span>Na</span>
        <b>shary</b>
        <p>{c.tagline}</p>
      </div>
    </div>
  );
}
