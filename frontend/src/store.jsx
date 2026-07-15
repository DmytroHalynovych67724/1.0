import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from './api';
import { languages, translate } from './i18n';

const StoreContext = createContext(null);
const regions = {
  pl: { label: { pl: 'Polska', uk: 'Польща', en: 'Poland' }, currency: 'PLN' },
  ua: { label: { pl: 'Ukraina', uk: 'Україна', en: 'Ukraine' }, currency: 'UAH' },
  eu: { label: { pl: 'Europa', uk: 'Європа', en: 'Europe' }, currency: 'EUR' },
};

function read(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

export function StoreProvider({ children }) {
  const [language, setLanguageState] = useState(
    () => localStorage.getItem('nashary-language') || 'pl'
  );
  const [region, setRegionState] = useState(() => localStorage.getItem('nashary-region') || 'pl');
  const [theme, setThemeState] = useState(
    () =>
      localStorage.getItem('nashary-theme') ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  );
  const [user, setUser] = useState(() => read('nashary-user', null));
  const [cart, setCart] = useState(() => read('nashary-react-cart', []));
  const [favorites, setFavorites] = useState(() => read('nashary-react-favorites', []));
  const [comparison, setComparison] = useState(() => read('nashary-react-comparison', []));
  const [notice, setNotice] = useState('');

  useEffect(() => {
    localStorage.setItem('nashary-react-cart', JSON.stringify(cart));
  }, [cart]);
  useEffect(() => {
    localStorage.setItem('nashary-react-favorites', JSON.stringify(favorites));
  }, [favorites]);
  useEffect(() => {
    localStorage.setItem('nashary-react-comparison', JSON.stringify(comparison));
  }, [comparison]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('nashary-theme', theme);
  }, [theme]);
  useEffect(() => {
    if (!localStorage.getItem('nashary-token')) return;
    api('/auth/me')
      .then((profile) => {
        const currentUser = profile.user || profile;
        setUser(currentUser);
        localStorage.setItem('nashary-user', JSON.stringify(currentUser));
      })
      .catch(() => {
        localStorage.removeItem('nashary-token');
        localStorage.removeItem('nashary-user');
        setUser(null);
      });
  }, []);
  useEffect(() => {
    const expireSession = () => setUser(null);
    window.addEventListener('nashary:auth-expired', expireSession);
    return () => window.removeEventListener('nashary:auth-expired', expireSession);
  }, []);

  const flash = useCallback((message) => {
    setNotice(message);
    window.clearTimeout(window.__nasharyNotice);
    window.__nasharyNotice = window.setTimeout(() => setNotice(''), 2800);
  }, []);
  const setLanguage = (value) => {
    localStorage.setItem('nashary-language', value);
    setLanguageState(value);
  };
  const setRegion = (value) => {
    localStorage.setItem('nashary-region', value);
    setRegionState(value);
    setCart([]);
  };
  const signIn = (token, profile) => {
    localStorage.setItem('nashary-token', token);
    localStorage.setItem('nashary-user', JSON.stringify(profile));
    setUser(profile);
  };
  const signOut = () => {
    localStorage.removeItem('nashary-token');
    localStorage.removeItem('nashary-user');
    setUser(null);
  };
  const setTheme = (value) => setThemeState(value === 'dark' ? 'dark' : 'light');
  const updateProfile = (profile) => {
    localStorage.setItem('nashary-user', JSON.stringify(profile));
    setUser(profile);
  };
  const addToCart = useCallback(
    (product, qty = 1) => {
      setCart((items) => {
        const current = items.find((item) => item.id === product.id);
        if (current)
          return items.map((item) =>
            item.id === product.id
              ? { ...item, qty: Math.min(item.qty + qty, product.stock) }
              : item
          );
        return [...items, { id: product.id, qty: Math.min(qty, product.stock), product }];
      });
      flash(translate(language, 'added'));
    },
    [flash, language]
  );
  const updateQty = (id, qty) =>
    setCart((items) =>
      items.map((item) =>
        item.id === id ? { ...item, qty: Math.max(1, Math.min(qty, item.product.stock)) } : item
      )
    );
  const removeFromCart = (id) => setCart((items) => items.filter((item) => item.id !== id));
  const toggleFavorite = (id) =>
    setFavorites((items) =>
      items.includes(id) ? items.filter((value) => value !== id) : [...items, id]
    );
  const toggleCompare = useCallback(
    (product) =>
      setComparison((items) => {
        if (items.some((item) => item.id === product.id))
          return items.filter((item) => item.id !== product.id);
        if (items.length >= 4) {
          flash(
            language === 'uk'
              ? 'Можна порівняти не більше чотирьох товарів.'
              : language === 'en'
                ? 'You can compare up to four products.'
                : 'Możesz porównać maksymalnie cztery produkty.'
          );
          return items;
        }
        return [...items, product];
      }),
    [flash, language]
  );
  const clearComparison = useCallback(() => setComparison([]), []);
  const t = useCallback((key) => translate(language, key), [language]);
  const formatPrice = useCallback(
    (value, currency = regions[region].currency) =>
      new Intl.NumberFormat(languages[language].locale, {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
      }).format(Number(value) || 0),
    [language, region]
  );

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      region,
      setRegion,
      regions,
      theme,
      setTheme,
      user,
      updateProfile,
      signIn,
      signOut,
      cart,
      setCart,
      addToCart,
      updateQty,
      removeFromCart,
      favorites,
      toggleFavorite,
      comparison,
      toggleCompare,
      clearComparison,
      notice,
      flash,
      t,
      formatPrice,
    }),
    [
      language,
      region,
      theme,
      user,
      cart,
      favorites,
      comparison,
      notice,
      flash,
      t,
      formatPrice,
      addToCart,
      toggleCompare,
      clearComparison,
    ]
  );
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used inside StoreProvider');
  return context;
}
