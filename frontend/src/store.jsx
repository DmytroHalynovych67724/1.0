import { normalizeComparison, comparisonAction } from './comparisonPolicy.mjs';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from './api';
import { languages, translate } from './i18n';
import { ownsListing, canBuyListing, ownerCopy } from './listingPolicy.mjs';
import { safeStorage, readJson as read, compactCart, compactProduct, compactProfile } from './browserStorage.mjs';

safeStorage.repair();

const StoreContext = createContext(null);
const regions = {
  pl: { label: { pl: 'Polska', uk: 'Польща', en: 'Poland' }, currency: 'PLN' },
  ua: { label: { pl: 'Ukraina', uk: 'Україна', en: 'Ukraine' }, currency: 'UAH' },
  eu: { label: { pl: 'Europa', uk: 'Європа', en: 'Europe' }, currency: 'EUR' },
};

function readFavorites() {
  const items = read('nashary-react-favorites', []);
  return Array.isArray(items) ? items.filter((id) => typeof id === 'string') : [];
}
function readComparison() {
  const items = read('nashary-react-comparison', []);
  return normalizeComparison(items).map(compactProduct);
}

export function StoreProvider({ children }) {
  const [language, setLanguageState] = useState(
    () => (languages[safeStorage.getItem('nashary-language')] ? safeStorage.getItem('nashary-language') : 'pl')
  );
  const [region, setRegionState] = useState(() => (regions[safeStorage.getItem('nashary-region')] ? safeStorage.getItem('nashary-region') : 'pl'));
  const [theme, setThemeState] = useState(
    () =>
      safeStorage.getItem('nashary-theme') ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  );
  const [user, setUser] = useState(() => safeStorage.getItem('nashary-token') ? read('nashary-user', null) : null);
  const [cart, setCart] = useState(() => compactCart(read('nashary-react-cart', [])));
  const [favorites, setFavorites] = useState(() => readFavorites());
  const [comparison, setComparison] = useState(() => readComparison());
  const [notice, setNotice] = useState('');
  const [initialProductIds] = useState(() => [...new Set([...cart.map((item) => item.id), ...comparison.map((item) => item.id)])]);
  useEffect(() => {
    let active = true;
    Promise.all(initialProductIds.map((id) => api(`/products/${encodeURIComponent(id)}`).catch(() => null)))
      .then((products) => {
        if (!active) return;
        const fresh = new Map(products.filter(Boolean).map((product) => [product.id, product]));
        setCart((items) => items.map((item) => fresh.has(item.id) ? { ...item, product: fresh.get(item.id) } : item));
        setComparison((items) => normalizeComparison(items.map((item) => fresh.get(item.id) || item)));
      });
    return () => { active = false; };
  }, [initialProductIds]);


  useEffect(() => {
    safeStorage.setItem('nashary-react-cart', JSON.stringify(compactCart(cart)));
  }, [cart]);
  useEffect(() => {
    safeStorage.setItem('nashary-react-favorites', JSON.stringify(favorites));
  }, [favorites]);
  useEffect(() => {
    safeStorage.setItem('nashary-react-comparison', JSON.stringify(comparison.map(compactProduct)));
  }, [comparison]);
  useEffect(() => {
    // Start waking a free Render instance while the user is still browsing the landing page.
    api('/health').catch(() => {});
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    safeStorage.setItem('nashary-theme', theme);
  }, [theme]);
  useEffect(() => {
    if (!safeStorage.getItem('nashary-token')) return;
    api('/auth/me')
      .then((profile) => {
        const currentUser = profile.user || profile;
        setUser(currentUser);
        safeStorage.setItem('nashary-user', JSON.stringify(compactProfile(currentUser)));
      })
      .catch((error) => {
        if (error.status !== 401 && error.status !== 403) return;
        safeStorage.removeItem('nashary-token');
        safeStorage.removeItem('nashary-user');
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
    safeStorage.setItem('nashary-language', value);
    setLanguageState(value);
  };
  const setRegion = (value) => {
    safeStorage.setItem('nashary-region', value);
    setRegionState(value);
    setCart([]);
  };
  const signIn = (token, profile) => {
    safeStorage.setItem('nashary-token', token);
    safeStorage.setItem('nashary-user', JSON.stringify(compactProfile(profile)));
    setUser(profile);
  };
  const signOut = () => {
    safeStorage.removeItem('nashary-token');
    safeStorage.removeItem('nashary-user');
    setUser(null);
  };
  const setTheme = (value) => setThemeState(value === 'dark' ? 'dark' : 'light');
  const updateProfile = (profile) => {
    safeStorage.setItem('nashary-user', JSON.stringify(compactProfile(profile)));
    setUser(profile);
  };
  const addToCart = useCallback(
    (product, qty = 1) => {
      if (ownsListing(user, product)) {
        flash((ownerCopy[language] || ownerCopy.pl).text);
        return;
      }
      if (!canBuyListing(user, product)) {
        flash(language === 'uk' ? 'Цей товар недоступний для покупки.' : language === 'pl' ? 'Ten produkt nie jest dostępny do zakupu.' : 'This product cannot be purchased.');
        return;
      }
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
    [flash, language, user]
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
  const toggleCompare = useCallback((product) => {
    const action = comparisonAction(comparison, product);
    if (action === 'category') {
      flash(language === 'uk' ? 'Порівнювати можна лише товари однієї категорії. Очисть список, щоб змінити категорію.' : language === 'en' ? 'Compare devices from one category. Clear the list to change category.' : 'Porównuj produkty jednej kategorii. Wyczyść listę, aby zmienić kategorię.');
      return;
    }
    if (action === 'limit') {
      flash(language === 'uk' ? 'Можна порівняти не більше чотирьох товарів.' : language === 'en' ? 'You can compare up to four products.' : 'Możesz porównać maksymalnie cztery produkty.');
      return;
    }
    setComparison((items) => action === 'remove' ? items.filter((item) => item.id !== product.id) : normalizeComparison([...items, product]));
  }, [comparison, flash, language]);
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
