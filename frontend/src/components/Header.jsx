import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import Logo from './Logo';
import { useStore } from '../store';
import { languages } from '../i18n';

function Icon({ name }) {
  const paths = {
    search: (
      <>
        <circle cx="11" cy="11" r="6.5" />
        <path d="m16 16 4 4" />
      </>
    ),
    globe: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M3.5 12h17M12 3.5c2.2 2.4 3.3 5.2 3.3 8.5S14.2 18.2 12 20.5C9.8 18.2 8.7 15.4 8.7 12S9.8 5.8 12 3.5Z" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5.5 20c.6-4 2.8-6 6.5-6s5.9 2 6.5 6" />
      </>
    ),
    bag: (
      <>
        <path d="M5 8h14l-1 12H6L5 8Z" />
        <path d="M9 9V7a3 3 0 0 1 6 0v2" />
      </>
    ),
    heart: (
      <path d="M20.5 9.2c0 5-8.5 10-8.5 10s-8.5-5-8.5-10A4.7 4.7 0 0 1 12 6a4.7 4.7 0 0 1 8.5 3.2Z" />
    ),
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    moon: <path d="M20 15.4A8.2 8.2 0 0 1 8.6 4 8.5 8.5 0 1 0 20 15.4Z" />,
    sun: (
      <>
        <circle cx="12" cy="12" r="3.5" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </>
    ),
  };
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

export default function Header() {
  const { t, language, setLanguage, region, setRegion, regions, theme, setTheme, user, cart, favorites } =
    useStore();
  const [query, setQuery] = useState('');
  const [localeOpen, setLocaleOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const localeRef = useRef(null);
  const navigate = useNavigate();
  useEffect(() => {
    const close = (event) => {
      if (!localeRef.current?.contains(event.target)) setLocaleOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);
  const search = (event) => {
    event.preventDefault();
    setMenuOpen(false);
    navigate(`/catalog${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ''}`);
  };
  const links = [
    ['/', t('home')],
    ['/catalog', t('catalog')],
    ['/games', t('games')],
    ['/trade-in', 'Trade-In'],
    ['/guides', language === 'pl' ? 'Poradnik' : language === 'uk' ? 'Порадник' : 'Guides'],
  ];
  const localeLabels = {
    pl: ['Język', 'Region'],
    uk: ['Мова', 'Регіон'],
    en: ['Language', 'Region'],
  }[language];
  return (
    <header className="app-header">
      <div className="shell app-header__main">
        <button
          className="icon-button mobile-only"
          type="button"
          aria-label="Menu"
          aria-expanded={menuOpen}
          onClick={() => {
            setLocaleOpen(false);
            setMenuOpen((value) => !value);
          }}
        >
          <Icon name="menu" />
        </button>
        <Logo />
        <form className="global-search" onSubmit={search}>
          <Icon name="search" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('search')}
          />
          <button type="submit">{t('catalog')}</button>
        </form>
        <div className="header-tools">
          <button
            className="icon-button theme-toggle"
            type="button"
            aria-label={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
          </button>
          <div className="locale" ref={localeRef}>
            <button
              className="icon-button"
              type="button"
              aria-label="Language and region"
              aria-expanded={localeOpen}
              onClick={() => {
                setMenuOpen(false);
                setLocaleOpen((value) => !value);
              }}
            >
              <Icon name="globe" />
              <span className="locale-current">{language.toUpperCase()} · {region.toUpperCase()}</span>
            </button>
            {localeOpen && (
              <div className="locale-panel">
                <span>{localeLabels[0]}</span>
                {Object.entries(languages).map(([code, item]) => (
                  <button
                    className={language === code ? 'is-active' : ''}
                    type="button"
                    key={code}
                    onClick={() => setLanguage(code)}
                  >
                    {item.label}
                  </button>
                ))}
                <span>{localeLabels[1]}</span>
                {Object.entries(regions).map(([code, item]) => (
                  <button
                    className={region === code ? 'is-active' : ''}
                    type="button"
                    key={code}
                    onClick={() => setRegion(code)}
                  >
                    {item.label[language]} · {item.currency}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Link
            className={`icon-button account-indicator${user ? ' is-authenticated' : ''}`}
            to={user ? '/account' : '/auth'}
            aria-label={t('account')}
          >
            <Icon name="user" />
          </Link>
          <Link
            className="icon-button favorites-indicator"
            to="/favorites"
            aria-label={language === 'pl' ? 'Ulubione' : language === 'uk' ? 'Обране' : 'Favourites'}
          >
            <Icon name="heart" />
            {favorites.length > 0 && <b>{favorites.length}</b>}
          </Link>
          <Link className="icon-button cart-indicator" to="/cart" aria-label={t('cart')}>
            <Icon name="bag" />
            {cart.length > 0 && <b>{cart.reduce((sum, item) => sum + item.qty, 0)}</b>}
          </Link>
        </div>
      </div>
      <div className={`app-nav${menuOpen ? ' is-open' : ''}`}>
        <nav className="shell">
          {links.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === '/'} onClick={() => setMenuOpen(false)}>
              {label}
            </NavLink>
          ))}
          <NavLink
            to="/sell"
            className="nav-sell"
            onClick={() => setMenuOpen(false)}
          >
            ＋ {t('sell')}
          </NavLink>
          <div className="mobile-nav-extras mobile-only">
            <Link to={user ? '/account' : '/auth'} onClick={() => setMenuOpen(false)}>
              <Icon name="user" />
              <span>{t('account')}</span>
              {user && <b>{user.username}</b>}
            </Link>
            <Link to="/favorites" onClick={() => setMenuOpen(false)}>
              <Icon name="heart" />
              <span>{language === 'pl' ? 'Ulubione' : language === 'uk' ? 'Обране' : 'Favourites'}</span>
              {favorites.length > 0 && <b>{favorites.length}</b>}
            </Link>
            <Link to="/cart" onClick={() => setMenuOpen(false)}>
              <Icon name="bag" />
              <span>{t('cart')}</span>
              {cart.length > 0 && <b>{cart.reduce((sum, item) => sum + item.qty, 0)}</b>}
            </Link>
            <button type="button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
              <span>{theme === 'dark' ? (language === 'pl' ? 'Tryb jasny' : language === 'uk' ? 'Світла тема' : 'Light mode') : (language === 'pl' ? 'Tryb ciemny' : language === 'uk' ? 'Темна тема' : 'Dark mode')}</span>
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
}
