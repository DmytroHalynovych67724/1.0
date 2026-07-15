import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useStore } from '../store';
import Logo from './Logo';

const copy = {
  pl: {
    title: 'Bądź pierwszy przy najlepszych okazjach',
    subtitle: 'Nowe oferty, spadki cen i krótkie porady — bez spamu.',
    placeholder: 'Twój adres e-mail', subscribe: 'Zapisz się', done: 'Gotowe — jesteś na liście.',
    market: 'Marketplace', help: 'Pomoc i bezpieczeństwo', account: 'Twoje konto', contact: 'Kontakt',
    newItems: 'Nowy sprzęt', usedItems: 'Używany sprzęt', sell: 'Dodaj ogłoszenie',
    safe: 'Bezpieczne zakupy', delivery: 'Dostawa i płatności', rules: 'Zasady serwisu',
  },
  uk: {
    title: 'Першими дізнавайтеся про найкращі пропозиції',
    subtitle: 'Нові оголошення, зниження цін і короткі поради — без спаму.',
    placeholder: 'Ваша електронна пошта', subscribe: 'Підписатися', done: 'Готово — ви у списку.',
    market: 'Маркетплейс', help: 'Допомога та безпека', account: 'Ваш акаунт', contact: 'Контакти',
    newItems: 'Нова техніка', usedItems: 'Вживана техніка', sell: 'Додати оголошення',
    safe: 'Безпечні покупки', delivery: 'Доставка й оплата', rules: 'Правила сервісу',
  },
  en: {
    title: 'Be first to see the best deals', subtitle: 'New listings, price drops and short guides — no spam.',
    placeholder: 'Your email address', subscribe: 'Subscribe', done: 'Done — you are on the list.',
    market: 'Marketplace', help: 'Help & safety', account: 'Your account', contact: 'Contact',
    newItems: 'New devices', usedItems: 'Pre-owned devices', sell: 'Create listing',
    safe: 'Safe shopping', delivery: 'Delivery & payments', rules: 'Marketplace rules',
  },
};

export default function Footer() {
  const { t, language, region, flash } = useStore();
  const c = copy[language] || copy.pl;
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const subscribe = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      await api('/marketplace/newsletter', { method: 'POST', body: JSON.stringify({ email, language, region }) });
      setDone(true); setEmail('');
    } catch (error) { flash(error.message); }
    finally { setBusy(false); }
  };
  return (
    <footer className="app-footer">
      <div className="shell newsletter-card">
        <div className="newsletter-icon" aria-hidden="true">✦</div>
        <div><h2>{c.title}</h2><p>{c.subtitle}</p></div>
        {done ? <strong className="newsletter-done">✓ {c.done}</strong> : <form onSubmit={subscribe}><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={c.placeholder} /><button disabled={busy} type="submit">{busy ? '…' : c.subscribe}</button></form>}
        <span className="newsletter-bell" aria-hidden="true">●</span>
      </div>
      <div className="footer-main">
        <div className="shell footer-grid">
          <div className="footer-brand"><Logo compact /><p>{language === 'pl' ? 'Nowa i używana elektronika w jednym spokojnym miejscu.' : language === 'uk' ? 'Нова та вживана електроніка в одному зручному місці.' : 'New and pre-owned electronics in one calm place.'}</p><span>PL · UA · EU</span></div>
          <div><b>{c.market}</b><Link to="/catalog?condition=new">{c.newItems}</Link><Link to="/catalog?condition=used">{c.usedItems}</Link><Link to="/sell">{c.sell}</Link><Link to="/trade-in">Trade‑In</Link><Link to="/games">NaShary Play</Link></div>
          <div><b>{c.help}</b><Link to="/guides">{c.safe}</Link><Link to="/guides">{c.delivery}</Link><Link to="/guides">{c.rules}</Link><Link to="/guides">FAQ</Link></div>
          <div><b>{c.account}</b><Link to="/account">{t('profile')}</Link><Link to="/account?tab=messages">{t('messages')}</Link><Link to="/cart">{t('cart')}</Link><span className="footer-contact">hello@nashary.market<br />Warszawa · Kyiv · Europe</span></div>
        </div>
        <div className="shell footer-bottom">© {new Date().getFullYear()} NaShary · {language === 'pl' ? 'Projekt dyplomowy' : language === 'uk' ? 'Дипломний проєкт' : 'Diploma project'}</div>
      </div>
    </footer>
  );
}
