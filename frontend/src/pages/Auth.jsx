import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import BrandMark from '../components/BrandMark';
import { api } from '../api';
import { useStore } from '../store';
import { accountCopy } from '../accountCopy';

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
  const details = accountCopy[language] || accountCopy.pl;
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ username: '', password: '', confirm: '', displayName: '', email: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [registered, setRegistered] = useState(false);
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
      if (mode === 'register') {
        await api('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ username: form.username, password: form.password, displayName: form.displayName, email: form.email }),
        });
        setRegistered(true);
        setMode('login');
      }
      const payload = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: form.username, password: form.password }),
      });
      signIn(payload.token, payload.user);
      const from = location.state?.from;
      navigate(typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') ? from : '/account', { replace: true });
    } catch (requestError) {
      const messages = {
        INVALID_CREDENTIALS: { uk: 'Неправильний логін, email або пароль.', pl: 'Niepoprawny login, email lub hasło.', en: 'Incorrect login, email or password.' },
        USERNAME_TAKEN: { uk: 'Цей логін уже зайнятий.', pl: 'Ten login jest już zajęty.', en: 'This username is taken.' },
        ACCOUNT_EXISTS: { uk: 'Цей логін або email уже зареєстрований.', pl: 'Ten login lub email jest już zarejestrowany.', en: 'This username or email is already registered.' },
        ACCOUNT_SUSPENDED: { uk: 'Доступ до акаунта призупинено адміністратором.', pl: 'Dostęp do konta został zawieszony.', en: 'Account access is suspended.' },
      };
      setError(messages[requestError.code]?.[language] || requestError.message);
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
            disabled={busy}
            aria-pressed={mode === 'login'}
            onClick={() => { setMode('login'); setError(''); }}
          >
            {t('login')}
          </button>
          <button
            className={mode === 'register' ? 'is-active' : ''}
            type="button"
            disabled={busy}
            aria-pressed={mode === 'register'}
            onClick={() => { setMode('register'); setError(''); }}
          >
            {t('register')}
          </button>
        </div>
        <span className="section-label">NaShary ID</span>
        <h1>{mode === 'login' ? c.welcome : c.create}</h1>
        <p>{c.lead}</p>
        <form onSubmit={submit}>
          {mode === 'register' && <>
            <label>{details.fields.displayName}<input required maxLength={80} autoComplete="name" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} /></label>
            <label>Email<input required type="email" maxLength={254} autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
          </>}
          <label>
            {mode === 'login' ? (language === 'uk' ? 'Логін або email' : 'Login / email') : (language === 'uk' ? 'Логін' : 'Login')}
            <input
              required
              minLength="3"
              maxLength={mode === 'register' ? 40 : 254}
              autoComplete="username"
              pattern={mode === 'register' ? '[\\p{L}\\p{N}._\\-]+' : undefined}
              value={form.username}
              onChange={(event) => setForm({ ...form, username: event.target.value })}
            />
          </label>
          <label>
            {c.password}
            <input
              required
              minLength={mode === 'register' ? 8 : 1}
              type={showPassword ? 'text' : 'password'}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
            />
          </label>
          <label className="password-visibility"><input type="checkbox" checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} />{language === 'uk' ? 'Показати пароль' : language === 'pl' ? 'Pokaż hasło' : 'Show password'}</label>
          {mode === 'register' && (
            <label>
              {c.repeat}
              <input
                required
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                minLength={8}
                value={form.confirm}
                onChange={(event) => setForm({ ...form, confirm: event.target.value })}
              />
            </label>
          )}
          {registered && error && <p role="status">{language === 'uk' ? 'Акаунт створено. Спробуйте увійти.' : language === 'pl' ? 'Konto utworzone. Spróbuj się zalogować.' : 'Account created. Please sign in.'}</p>}
          {error && <div className="form-error" role="alert">{error}</div>}
          <button className="primary-button primary-button--wide" disabled={busy} type="submit">
            {busy ? '…' : mode === 'login' ? t('login') : t('register')}
          </button>
        </form>
        <Link to="/">← {c.back}</Link>
      </div>
      <div className="auth-react__aside">
        <BrandMark />
        <b>NaShary</b>
        <p>{c.tagline}</p>
      </div>
    </div>
  );
}
