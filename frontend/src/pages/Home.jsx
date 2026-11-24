import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, imageUrl, catalogPreview } from '../api';
import ProductCard from '../components/ProductCard';
import QuickView from '../components/QuickView';
import BrandMark from '../components/BrandMark';
import ManufacturerLogo from '../components/ManufacturerLogo';
import { useStore } from '../store';
import { sectionCopy } from '../catalogSections.mjs';

const content = {
  uk: { eyebrow: 'NASHARY · НОВА ТЕХНІКА', title: 'Твій наступний', accent: 'апгрейд тут.', lead: 'Смартфони, ноутбуки та аксесуари. Обирай нове, порівнюй характеристики й знаходь свою конфігурацію.', shop: 'Обрати нову техніку', usedTitle: 'Б/в. Окремий простір.', usedLead: 'Пристрої від власників, реальні фото та можливість домовитися про ціну.', usedLink: 'До маркетплейсу', trade: 'Час для Trade-In', tradeLead: 'Дізнайся орієнтовну вартість свого пристрою.', tradeLink: 'Оцінити пристрій', categories: 'Що шукаємо сьогодні?', brands: 'Твій бренд — твій вибір', guide: 'Обирай з розумінням', guideTitle: 'Версія пристрою має значення', guideLead: 'Перевір комплектацію, підтримку мереж і умови гарантії перед замовленням.', guideLink: 'Відкрити порадник', games: 'Трохи гри. Більше вигоди.', gamesLead: 'Перевір знання та отримай персональний промокод.', gamesLink: 'До ігор', loading: 'Завантажуємо пропозиції…' },
  pl: { eyebrow: 'NASHARY · NOWY SPRZĘT', title: 'Twój kolejny', accent: 'upgrade jest tutaj.', lead: 'Smartfony, laptopy i akcesoria. Wybieraj nowe, porównuj parametry i znajdź swoją konfigurację.', shop: 'Odkryj nowy sprzęt', usedTitle: 'Używane. Własna przestrzeń.', usedLead: 'Sprzęt od właścicieli, rzeczywiste zdjęcia i możliwość negocjacji ceny.', usedLink: 'Do marketplace', trade: 'Czas na Trade-In', tradeLead: 'Poznaj szacunkową wartość swojego urządzenia.', tradeLink: 'Wyceń urządzenie', categories: 'Czego dziś szukasz?', brands: 'Twoja marka — Twój wybór', guide: 'Wybieraj świadomie', guideTitle: 'Wersja urządzenia ma znaczenie', guideLead: 'Sprawdź wyposażenie, obsługiwane sieci i warunki gwarancji przed zamówieniem.', guideLink: 'Otwórz poradnik', games: 'Trochę gry. Więcej korzyści.', gamesLead: 'Sprawdź wiedzę i odbierz osobisty kod rabatowy.', gamesLink: 'Przejdź do gier', loading: 'Wczytujemy oferty…' },
  en: { eyebrow: 'NASHARY · NEW DEVICES', title: 'Your next', accent: 'upgrade is here.', lead: 'Phones, laptops and accessories. Explore new devices, compare specs and find your configuration.', shop: 'Explore new devices', usedTitle: 'Pre-owned. Its own space.', usedLead: 'Devices from their owners, actual photos and room to negotiate.', usedLink: 'Explore marketplace', trade: 'Time for Trade-In', tradeLead: 'Get an estimated value for your device.', tradeLink: 'Value my device', categories: 'What are you looking for?', brands: 'Your brand. Your choice.', guide: 'Make an informed choice', guideTitle: 'Device versions matter', guideLead: 'Check included accessories, network support and warranty terms before ordering.', guideLink: 'Read the guide', games: 'A little play. More rewards.', gamesLead: 'Test your knowledge and earn a personal promo code.', gamesLink: 'Explore games', loading: 'Loading offers…' },
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
  const sc = sectionCopy[language] || sectionCopy.pl;
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState('loading');
  const [source, setSource] = useState('live');
  const [attempt, setAttempt] = useState(0);
  const [preview, setPreview] = useState(null);
  useEffect(() => {
    let active = true;
    let live = false;
    const timer = window.setTimeout(() => {
      catalogPreview('/products?region=' + region).then((items) => {
        if (active && !live) { setProducts(items); setStatus('ready'); setSource('preview'); }
      }).catch(() => {});
    }, 1500);
    api('/products?region=' + region).then((items) => {
      if (active) { live = true; setProducts(items); setStatus('ready'); setSource('live'); }
    }).catch(() => { if (active) setStatus((current) => current === 'ready' ? current : 'error'); });
    return () => { active = false; window.clearTimeout(timer); };
  }, [region, attempt]);
  const sections = [['new', '/catalog', sc.newLead], ['used', '/marketplace', sc.usedLead]];
  return <div className="storefront">
    <section className="shell storefront-hero">
      <div className="storefront-main">
        <div className="storefront-copy"><span className="section-label">{c.eyebrow}</span><h1>{c.title}<br /><em>{c.accent}</em></h1><p>{c.lead}</p><Link className="primary-button" to="/catalog">{c.shop} ↗</Link><div className="market-stamp"><BrandMark /> PL / UA / EU <span>NaShary</span></div></div>
        <div className="storefront-art" aria-hidden="true"><span className="orbit orbit-one" /><span className="orbit orbit-two" /><img src={imageUrl('/assets/products/phone.svg')} alt="" /><span className="art-caption">NaShary / NEW DEVICES</span></div>
      </div>
      <div className="storefront-side">
        <Link className="promo-used" to="/marketplace"><span className="promo-tag">NASHARY MARKETPLACE</span><h2>{c.usedTitle}</h2><p>{c.usedLead}</p><span className="promo-link">{c.usedLink} ↗</span><img src={imageUrl('/assets/products/headphones.svg')} alt="" /></Link>
        <Link className="promo-trade" to="/trade-in"><span className="promo-tag">TRADE-IN</span><h2>{c.trade}</h2><p>{c.tradeLead}</p><span className="promo-link">{c.tradeLink} ↗</span><span className="trade-arrow" aria-hidden="true">↗</span></Link>
      </div>
    </section>
    <section className="shell storefront-categories"><div className="section-head"><h2>{c.categories}</h2><Link to="/catalog">{sc.new} ↗</Link></div><div className="store-category-grid">{categories.map(([value, image, uk, en]) => <Link key={value} to={'/catalog?category=' + encodeURIComponent(value)}><img src={imageUrl('/assets/products/' + image + '.svg')} alt="" /><b>{language === 'uk' ? uk : language === 'en' ? en : value}</b><span aria-hidden="true">↗</span></Link>)}</div></section>
    {source === 'preview' && <div className="shell catalog-source-note" role="status"><p>{sc.preview}</p><button className="quiet-button" type="button" onClick={() => setAttempt((n) => n + 1)}>{sc.retry}</button></div>}
    {sections.map(([condition, path, lead]) => {
      const items = products.filter((item) => item.condition === condition).slice(0, condition === 'new' ? 8 : 4);
      return <section className={'shell storefront-products storefront-products--' + condition} key={condition}><div className="section-head"><div><span className="section-label">{condition === 'new' ? 'NASHARY / NEW' : 'NASHARY / PRE-OWNED'}</span><h2>{sc[condition]}</h2><p className="store-section-lead">{lead}</p></div><Link to={path}>{sc.all} ↗</Link></div>
        {status === 'loading' ? <div role="status"><p>{c.loading}</p><div className="store-skeletons">{[0,1,2,3].map((i) => <div key={i} />)}</div></div> : status === 'error' ? <div className="store-empty" role="alert"><p>{sc.error}</p><button className="quiet-button" type="button" onClick={() => setAttempt((n) => n + 1)}>{sc.retry}</button></div> : items.length ? <div className="product-grid-react">{items.map((product) => <ProductCard key={product.id} product={product} onQuickView={setPreview} />)}</div> : <div className="store-empty"><p>{condition === 'new' ? sc.newEmpty : sc.usedEmpty}</p><Link className="quiet-button" to={condition === 'new' ? '/marketplace' : '/sell'}>{condition === 'new' ? sc.used : sc.sell} ↗</Link></div>}
      </section>;
    })}
    <section className="shell storefront-brands"><h2>{c.brands}</h2><div>{['Apple', 'Samsung', 'Google', 'Sony', 'Lenovo', 'ASUS'].map((brand) => <Link key={brand} aria-label={brand} to={'/catalog?brand=' + encodeURIComponent(brand)}><ManufacturerLogo brand={brand} /><span className="manufacturer-link-arrow" aria-hidden="true">↗</span></Link>)}</div></section>
    <section className="shell storefront-editorial"><div className="section-head"><h2>{c.guide}</h2></div><div className="editorial-grid"><Link to="/guides"><span className="section-label">NASHARY GUIDE</span><h3>{c.guideTitle}</h3><p>{c.guideLead}</p><b>{c.guideLink} ↗</b></Link><Link to="/games"><span className="section-label">PLAY & SAVE</span><h3>{c.games}</h3><p>{c.gamesLead}</p><b>{c.gamesLink} ↗</b></Link></div></section>
    {preview && <QuickView product={preview} onClose={() => setPreview(null)} />}
  </div>;
}
