import { useEffect } from 'react';
import { Outlet, ScrollRestoration, useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import Assistant from './Assistant';
import { useStore } from '../store';
import { isStaticDemo } from '../api';

const demoCopy = {
  pl: 'Wersja demonstracyjna: katalog i koszyk działają lokalnie. Konto, czat i zakupy wymagają uruchomionego serwera.',
  uk: 'Демонстраційна версія: каталог і кошик працюють локально. Акаунт, чат і покупки потребують запущеного сервера.',
  en: 'Demo version: the catalog and cart work locally. Accounts, chat and checkout require a running server.',
};

const pageTitles = {
  uk: { '/': 'Техніка ближче до тебе', '/catalog': 'Нова техніка', '/marketplace': 'Б/в маркетплейс', '/favorites': 'Обране', '/cart': 'Кошик', '/auth': 'Вхід і реєстрація', '/account': 'Кабінет', '/sell': 'Нове оголошення', '/games': 'Мініігри', '/games/quiz': 'Техноквіз', '/games/tictactoe': 'Хрестики-нулики', '/games/precision': 'Зона точності', missing: 'Сторінку не знайдено' },
  pl: { '/': 'Elektronika bliżej Ciebie', '/catalog': 'Nowy sprzęt', '/marketplace': 'Używany sprzęt', '/favorites': 'Ulubione', '/cart': 'Koszyk', '/auth': 'Logowanie i rejestracja', '/account': 'Moje konto', '/sell': 'Nowe ogłoszenie', '/games': 'Minigry', '/games/quiz': 'Quiz technologiczny', '/games/tictactoe': 'Kółko i krzyżyk', '/games/precision': 'Strefa precyzji', missing: 'Nie znaleziono strony' },
  en: { '/': 'Electronics closer to you', '/catalog': 'New devices', '/marketplace': 'Pre-owned marketplace', '/favorites': 'Favorites', '/cart': 'Cart', '/auth': 'Sign in and register', '/account': 'My account', '/sell': 'New listing', '/games': 'Minigames', '/games/quiz': 'Tech quiz', '/games/tictactoe': 'Tic-tac-toe', '/games/precision': 'Precision zone', missing: 'Page not found' },
};

export default function Layout() {
  const { notice, language } = useStore();
  const location = useLocation();
  const authOnly = location.pathname === '/auth';
  useEffect(() => {
    const path = location.pathname.replace(/\/+$/, '') || '/';
    // These pages provide their own title, including the fetched device name.
    if (/^\/(product|model)\//.test(path) || ['/guides', '/trade-in'].includes(path)) return;
    const titles = pageTitles[language] || pageTitles.pl;
    document.title = `${titles[path] || titles.missing} — NaShary`;
  }, [location.pathname, language]);
  return (
    <div className="app-frame">
      {authOnly ? null : <Header />}
      {isStaticDemo && !authOnly && (
        <div className="pages-demo-note" role="status">
          {demoCopy[language] || demoCopy.pl}
        </div>
      )}
      <main className="route-stage" key={location.pathname}>
        <Outlet />
      </main>
      {authOnly ? null : <Footer />}
      {authOnly ? null : <Assistant />}
      {notice && (
        <div className="toast" role="status">
          {notice}
        </div>
      )}
      <ScrollRestoration />
    </div>
  );
}
