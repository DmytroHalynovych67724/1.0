import { Link } from 'react-router-dom';
import { useStore } from '../store';
import Logo from './Logo';

const copy = {
  uk: { market: 'Обирай і продавай', help: 'Перед покупкою', account: 'Твій NaShary', newItems: 'Нова техніка', usedItems: 'Б/в маркетплейс', sell: 'Створити оголошення', safe: 'Перевірка б/в техніки', delivery: 'Доставка й оплата', versions: 'CN, Global та комплектація', rules: 'Оголошення та довіра', about: 'Нова техніка від магазину та схвалених продавців. Б/в — окремий простір для пристроїв від власників.', project: 'Дипломний проєкт', saved: 'Обране', games: 'Ігри та промокоди' },
  pl: { market: 'Kupuj i sprzedawaj', help: 'Przed zakupem', account: 'Twój NaShary', newItems: 'Nowy sprzęt', usedItems: 'Sprzęt używany', sell: 'Dodaj ogłoszenie', safe: 'Sprawdzanie używanego sprzętu', delivery: 'Dostawa i płatności', versions: 'CN, Global i wyposażenie', rules: 'Ogłoszenia i zaufanie', about: 'Nowy sprzęt od sklepu i zatwierdzonych sprzedawców. Osobna przestrzeń dla używanych urządzeń od właścicieli.', project: 'Projekt dyplomowy', saved: 'Ulubione', games: 'Gry i kody rabatowe' },
  en: { market: 'Shop and sell', help: 'Before you buy', account: 'Your NaShary', newItems: 'New devices', usedItems: 'Pre-owned marketplace', sell: 'Create listing', safe: 'Inspect a used device', delivery: 'Delivery and payments', versions: 'CN, Global and accessories', rules: 'Listings and trust', about: 'New devices from the store and approved sellers. A separate marketplace for pre-owned devices from their owners.', project: 'Diploma project', saved: 'Favorites', games: 'Games and promo codes' },
};

export default function Footer() {
  const { t, language } = useStore();
  const c = copy[language] || copy.pl;
  return <footer className="app-footer">
    <div className="footer-main"><div className="shell footer-grid">
      <div className="footer-brand"><Logo /><p>{c.about}</p><span>PL · UA · EU</span></div>
      <div><b>{c.market}</b><Link to="/catalog">{c.newItems}</Link><Link to="/marketplace">{c.usedItems}</Link><Link to="/sell">{c.sell}</Link><Link to="/games">{c.games}</Link></div>
      <div><b>{c.help}</b><Link to="/guides#used">{c.safe}</Link><Link to="/guides#import">{c.versions}</Link><Link to="/guides#delivery">{c.delivery}</Link><Link to="/guides#trust">{c.rules}</Link></div>
      <div><b>{c.account}</b><Link to="/account">{t('profile')}</Link><Link to="/account?tab=messages">{t('messages')}</Link><Link to="/favorites">{c.saved}</Link><Link to="/cart">{t('cart')}</Link></div>
    </div><div className="shell footer-bottom"><span>© {new Date().getFullYear()} NaShary</span><span>{c.project}</span></div></div>
  </footer>;
}
