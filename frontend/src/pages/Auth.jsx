import { useEffect, useRef, useState } from 'react';
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
  const [slow, setSlow] = useState(false);
  const submitting = useRef(false);
  useEffect(() => {
    if (!busy) return;
    const timer = setTimeout(() => setSlow(true), 8000);
    return () => clearTimeout(timer);
  }, [busy]);
  const navigate = useNavigate();
  const location = useLocation();
  const submit = async (event) => {
    event.preventDefault();
    if (submitting.current) return;
    setError('');
    if (mode === 'register' && form.password !== form.confirm) return setError(c.mismatch);
    submitting.current = true;
    setSlow(false);
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
      if (!payload?.token || !payload?.user) throw Object.assign(new Error('Invalid response'), { code: 'INVALID_RESPONSE' });
      signIn(payload.token, payload.user);
      const from = location.state?.from;
      navigate(typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') ? from : '/account', { replace: true });
    } catch (requestError) {
      const messages = {
        REQUEST_TIMEOUT: { uk: 'Сервер не відповів вчасно. Спробуй увійти ще раз. Якщо щойно реєструвався — акаунт міг уже створитися.', pl: 'Serwer nie odpowiedział na czas. Spróbuj się zalogować ponownie. Jeśli trwała rejestracja, konto mogło już powstać.', en: 'The server did not respond in time. Try signing in again. If you were registering, the account may already have been created.' },
        NETWORK_ERROR: { uk: 'Не вдалося з’єднатися із сервером. Перевір інтернет і спробуй ще раз.', pl: 'Nie udało się połączyć z serwerem. Sprawdź połączenie i spróbuj ponownie.', en: 'Could not connect to the server. Check your connection and try again.' },
        SERVER_UNAVAILABLE: { uk: 'Сервер тимчасово недоступний. Спробуй увійти трохи пізніше.', pl: 'Serwer jest chwilowo niedostępny. Spróbuj później.', en: 'The server is temporarily unavailable. Try again shortly.' },
        INVALID_RESPONSE: { uk: 'Сервер повернув неповну відповідь. Спробуй увійти ще раз.', pl: 'Niepełna odpowiedź serwera. Spróbuj ponownie.', en: 'The server returned an incomplete response. Try signing in again.' },
        INVALID_CREDENTIALS: { uk: 'Неправильний логін, email або пароль.', pl: 'Niepoprawny login, email lub hasło.', en: 'Incorrect login, email or password.' },
        USERNAME_TAKEN: { uk: 'Цей логін уже зайнятий.', pl: 'Ten login jest już zajęty.', en: 'This username is taken.' },
        ACCOUNT_EXISTS: { uk: 'Цей логін або email уже зареєстрований.', pl: 'Ten login lub email jest już zarejestrowany.', en: 'This username or email is already registered.' },
        ACCOUNT_SUSPENDED: { uk: 'Доступ до акаунта призупинено адміністратором.', pl: 'Dostęp do konta został zawieszony.', en: 'Account access is suspended.' },
      };
      setError(messages[requestError.code]?.[language] || requestError.message);
    } finally {
      submitting.current = false;
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
        <form onSubmit={submit} aria-busy={busy}>
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
          {busy && slow && <p role="status">{language === 'uk' ? 'Сервер довше відповідає. Зачекай трохи; повторно натискати не потрібно.' : language === 'en' ? 'The server is taking longer to respond. Please wait; you do not need to press again.' : 'Serwer odpowiada dłużej. Poczekaj chwilę; nie trzeba klikać ponownie.'}</p>}
          {error && <div className="form-error" role="alert">{error}</div>}
          <button className="primary-button primary-button--wide" disabled={busy} type="submit">
            {busy ? (language === 'uk' ? 'З’єднуємося…' : language === 'en' ? 'Connecting…' : 'Łączenie…') : mode === 'login' ? t('login') : t('register')}
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
