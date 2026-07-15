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

export default function Layout() {
  const { notice, language } = useStore();
  const location = useLocation();
  const authOnly = location.pathname === '/auth';
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
