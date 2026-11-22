import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, imageUrl, catalogPreview } from '../api';
import ProductCard from '../components/ProductCard';
import QuickView from '../components/QuickView';
import { useStore } from '../store';

const content = {
  uk: ['ТЕХНІКА З НОВОЮ ІСТОРІЄЮ', 'Твій наступний апгрейд.', 'За твоїми правилами.', 'Нове чи вживане? Обирай, порівнюй і домовляйся про ціну. Знайди свою техніку на NaShary.', 'Знайти свою техніку', 'Вживане. Більше можливостей.', 'Друга історія техніки починається з тебе.', 'Переглянути пропозиції', 'Час для Trade-In', 'Дізнайся орієнтовну вартість свого пристрою.', 'Оцінити пристрій', 'Що шукаємо сьогодні?', 'Весь каталог', 'Знайди свій наступний девайс', 'Усі пропозиції', 'Нова техніка', 'Вживана техніка', 'Твій бренд — твій вибір', 'Вдалий вибір починається з деталей', 'Як перевірити вживану техніку', 'Батарея, екран, комплектація: чеклисти перед покупкою.', 'Відкрити порадник', 'Трохи гри. Більше вигоди.', 'Перевір знання та виграй персональний промокод.', 'До ігор', 'Завантажуємо пропозиції…', 'Не вдалося завантажити пропозиції.', 'Спробувати ще раз', 'У цьому розділі поки немає пропозицій.'],
  pl: ['TECHNOLOGIA Z NOWĄ HISTORIĄ', 'Twój kolejny upgrade.', 'Na Twoich zasadach.', 'Nowe czy używane? Wybieraj, porównuj i negocjuj cenę. Znajdź swój sprzęt na NaShary.', 'Znajdź swój sprzęt', 'Używane. Więcej możliwości.', 'Druga historia sprzętu zaczyna się od Ciebie.', 'Zobacz oferty', 'Czas na Trade-In', 'Poznaj szacunkową wartość swojego urządzenia.', 'Wyceń urządzenie', 'Czego dziś szukasz?', 'Cały katalog', 'Znajdź swój kolejny sprzęt', 'Wszystkie oferty', 'Nowy sprzęt', 'Używany sprzęt', 'Twoja marka — Twój wybór', 'Dobry wybór zaczyna się od szczegółów', 'Jak sprawdzić używany sprzęt', 'Bateria, ekran, wyposażenie: listy kontrolne przed zakupem.', 'Otwórz poradnik', 'Trochę gry. Więcej korzyści.', 'Sprawdź wiedzę i wygraj osobisty kod rabatowy.', 'Przejdź do gier', 'Wczytujemy oferty…', 'Nie udało się wczytać ofert.', 'Spróbuj ponownie', 'Nie ma jeszcze ofert w tej sekcji.'],
  en: ['TECH WITH A NEW STORY', 'Your next upgrade.', 'On your terms.', 'New or pre-owned? Explore, compare and negotiate. Find your next device on NaShary.', 'Find your next device', 'Pre-owned. More possibilities.', 'The next chapter starts with you.', 'Explore offers', 'Time for Trade-In', 'Get an estimated value for your device.', 'Value my device', 'What are you looking for?', 'Full catalog', 'Discover your next device', 'All offers', 'New devices', 'Pre-owned devices', 'Your brand. Your choice.', 'A good choice starts with the details', 'How to check pre-owned tech', 'Battery, screen, accessories: checklists before you buy.', 'Read the guide', 'A little play. More rewards.', 'Test your knowledge and win a personal promo code.', 'Explore games', 'Loading offers…', 'Could not load offers.', 'Try again', 'No offers in this section yet.'],
};
const categories = [
  ['Smartfony', 'phone', 'Смартфони', 'Smartphones'],
  ['Laptopy', 'laptop', 'Ноутбуки', 'Laptops'],
  ['Gaming', 'console', 'Геймінг', 'Gaming'],
  ['Audio', 'headphones', 'Аудіо', 'Audio'],
  ['Monitory', 'monitor', 'Монітори', 'Monitors'],
  ['Akcesoria', 'watch', 'Аксесуари', 'Accessories'],
];

export default function Storefront() {
  const { region } = useStore();
  return <StorefrontContent key={region} />;
}

function StorefrontContent() {
  const { region, language } = useStore();
  const c = content[language] || content.pl;
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState('loading');
  const [attempt, setAttempt] = useState(0);
  const [filter, setFilter] = useState(0);
  const [preview, setPreview] = useState(null);
  useEffect(() => {
    let active = true;
    let live = false;
    const timer = window.setTimeout(() => {
      catalogPreview(`/products?region=${region}`).then((items) => {
        if (active && !live) { setProducts(items); setStatus('ready'); }
      }).catch(() => {});
    }, 1500);
    api(`/products?region=${region}`).then((items) => {
      if (active) { live = true; setProducts(items); setStatus('ready'); }
    }).catch(() => { if (active) setStatus((current) => current === 'ready' ? current : 'error'); });
    return () => { active = false; window.clearTimeout(timer); };
  }, [region, attempt]);
  const visible = products.filter((item) => !filter || item.condition === (filter === 1 ? 'new' : 'used')).slice(0, 8);
  return <div className="storefront">
    <section className="shell storefront-hero">
      <div className="storefront-main">
        <div className="storefront-copy"><span className="section-label">{c[0]}</span><h1>{c[1]}<br /><em>{c[2]}</em></h1><p>{c[3]}</p><Link className="primary-button" to="/catalog">{c[4]} ↗</Link><div className="market-stamp">PL / UA / EU <span>NaShary marketplace</span></div></div>
        <div className="storefront-art" aria-hidden="true"><span className="orbit orbit-one" /><span className="orbit orbit-two" /><img src={imageUrl('/assets/products/phone.svg')} alt="" /><span className="art-caption">NEW + PRE-OWNED</span></div>
      </div>
      <div className="storefront-side">
        <Link className="promo-used" to="/catalog?condition=used"><span className="promo-tag">SECOND LIFE / SMART CHOICE</span><h2>{c[5]}</h2><p>{c[6]}</p><span className="promo-link">{c[7]} ↗</span><img src={imageUrl('/assets/products/headphones.svg')} alt="" /></Link>
        <Link className="promo-trade" to="/trade-in"><span className="promo-tag">TRADE-IN</span><h2>{c[8]}</h2><p>{c[9]}</p><span className="promo-link">{c[10]} ↗</span><span className="trade-arrow" aria-hidden="true">↗</span></Link>
      </div>
    </section>
    <section className="shell storefront-categories"><div className="section-head"><h2>{c[11]}</h2><Link to="/catalog">{c[12]} ↗</Link></div><div className="store-category-grid">{categories.map(([value, image, uk, en]) => <Link key={value} to={`/catalog?category=${encodeURIComponent(value)}`}><img src={imageUrl(`/assets/products/${image}.svg`)} alt="" /><b>{language === 'uk' ? uk : language === 'en' ? en : value}</b><span aria-hidden="true">↗</span></Link>)}</div></section>
    <section className="shell storefront-products"><div className="section-head"><div><span className="section-label">CURATED BY NASHARY</span><h2>{c[13]}</h2></div><Link to="/catalog">{c[12]} ↗</Link></div><div className="store-filter" aria-label={c[13]}>{c.slice(14, 17).map((label, index) => <button type="button" key={label} aria-pressed={filter === index} className={filter === index ? 'is-active' : ''} onClick={() => setFilter(index)}>{label}</button>)}</div>
      {status === 'loading' ? <div role="status"><p>{c[25]}</p><div className="store-skeletons">{[0,1,2,3].map((i) => <div key={i} />)}</div></div> : status === 'error' ? <div className="store-empty" role="alert"><p>{c[26]}</p><button className="quiet-button" type="button" onClick={() => setAttempt((n) => n + 1)}>{c[27]}</button></div> : visible.length ? <div className="product-grid-react">{visible.map((product) => <ProductCard key={product.id} product={product} onQuickView={setPreview} />)}</div> : <p className="store-empty">{c[28]}</p>}
    </section>
    <section className="shell storefront-brands"><h2>{c[17]}</h2><div>{['Apple', 'Samsung', 'Google', 'Sony', 'Lenovo', 'ASUS'].map((brand) => <Link key={brand} to={`/catalog?brand=${encodeURIComponent(brand)}`}>{brand}<span aria-hidden="true">↗</span></Link>)}</div></section>
    <section className="shell storefront-editorial"><div className="section-head"><h2>{c[18]}</h2></div><div className="editorial-grid"><Link to="/guides"><span className="section-label">NASHARY GUIDE</span><h3>{c[19]}</h3><p>{c[20]}</p><b>{c[21]} ↗</b></Link><Link to="/games"><span className="section-label">PLAY & SAVE</span><h3>{c[22]}</h3><p>{c[23]}</p><b>{c[24]} ↗</b></Link></div></section>
    {preview && <QuickView product={preview} onClose={() => setPreview(null)} />}
  </div>;
}
