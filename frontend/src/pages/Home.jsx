import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, imageUrl } from '../api';
import ProductCard from '../components/ProductCard';
import { useStore } from '../store';

const categories = [
  [
    'Smartfony',
    '01',
    { pl: 'Smartfony', uk: 'Смартфони', en: 'Smartphones' },
    '/assets/products/phone.svg',
  ],
  [
    'Laptopy',
    '02',
    { pl: 'Laptopy', uk: 'Ноутбуки', en: 'Laptops' },
    '/assets/products/laptop.svg',
  ],
  ['Gaming', '03', { pl: 'Gaming', uk: 'Геймінг', en: 'Gaming' }, '/assets/products/console.svg'],
  ['Audio', '04', { pl: 'Audio', uk: 'Аудіо', en: 'Audio' }, '/assets/products/headphones.svg'],
  [
    'Monitory',
    '05',
    { pl: 'TV i monitory', uk: 'TV і монітори', en: 'TV & monitors' },
    '/assets/products/monitor.svg',
  ],
  [
    'Akcesoria',
    '06',
    { pl: 'Akcesoria', uk: 'Аксесуари', en: 'Accessories' },
    '/assets/products/watch.svg',
  ],
];
const local = {
  pl: {
    regions: 'regiony',
    fees: 'ukrytych opłat',
    offers: 'nowe oferty',
    one: 'nowe + używane',
    place: 'jedno miejsce',
    quick: 'Szybki wybór',
    category: 'Znajdź sprzęt po swojemu',
    today: 'Dziś warto',
    zone: 'Strefa nagród',
    title: 'Wygraj kod, którego nie da się po prostu skopiować.',
    text: 'Refleks, wiedza albo rzadka wygrana z naszym AI. Każdy kod jest osobisty i jednorazowy.',
  },
  uk: {
    regions: 'регіони',
    fees: 'прихованих оплат',
    offers: 'нові пропозиції',
    one: 'нове + вживане',
    place: 'в одному місці',
    quick: 'Швидкий вибір',
    category: 'Знайди техніку під себе',
    today: 'Варто сьогодні',
    zone: 'Зона нагород',
    title: 'Виграй код, який не можна просто скопіювати.',
    text: 'Реакція, знання або рідкісна перемога над нашим AI. Кожен код персональний та одноразовий.',
  },
  en: {
    regions: 'regions',
    fees: 'hidden fees',
    offers: 'new offers',
    one: 'new + pre-owned',
    place: 'one place',
    quick: 'Quick choice',
    category: 'Find tech that fits your life',
    today: 'Worth seeing today',
    zone: 'Rewards zone',
    title: 'Win a code that cannot simply be copied.',
    text: 'Reflexes, knowledge, or a rare win against our AI. Every code is personal and single-use.',
  },
};

export default function Home() {
  const { t, region, language } = useStore();
  const c = local[language] || local.pl;
  const [products, setProducts] = useState([]);
  useEffect(() => {
    api(`/products?region=${region}`)
      .then((items) => setProducts(items.slice(0, 4)))
      .catch(() => setProducts([]));
  }, [region]);
  return (
    <>
      <section className="intro-hero">
        <div className="shell intro-grid">
          <div className="intro-copy">
            <span className="section-label">{t('introTag')}</span>
            <h1>{t('introTitle')}</h1>
            <p>{t('introText')}</p>
            <div className="hero-actions">
              <Link className="primary-button primary-button--large" to="/catalog">
                {t('openCatalog')}
              </Link>
              <Link className="quiet-button" to="/games">
                {t('play')}
              </Link>
            </div>
            <div className="hero-metrics">
              <div>
                <b>3</b>
                <span>{c.regions}</span>
              </div>
              <div>
                <b>0%</b>
                <span>{c.fees}</span>
              </div>
              <div>
                <b>24/7</b>
                <span>{c.offers}</span>
              </div>
            </div>
          </div>
          <div className="intro-art" aria-hidden="true">
            <div className="art-card art-card--phone">
              <span></span>
              <b>–38%</b>
            </div>
            <div className="art-card art-card--console">
              <i></i>
              <i></i>
            </div>
            <div className="art-note">
              {c.one}
              <br />
              <b>{c.place}</b>
            </div>
          </div>
        </div>
      </section>
      <section className="page-section">
        <div className="shell">
          <div className="section-head">
            <div>
              <span className="section-label">{c.quick}</span>
              <h2>{c.category}</h2>
            </div>
            <Link to="/catalog">{t('seeAll')}</Link>
          </div>
          <div className="category-tiles">
            {categories.map(([value, number, label, image]) => (
              <Link
                className="category-photo-card"
                key={value}
                to={`/catalog?category=${encodeURIComponent(value)}`}
                data-label={label[language] || label.pl}
              >
                <img src={imageUrl(image)} alt="" />
                <span>{number}</span>
                <div>
                  <b>{label[language] || label.pl}</b>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <section className="page-section page-section--soft">
        <div className="shell">
          <div className="section-head">
            <div>
              <span className="section-label">{c.today}</span>
              <h2>{t('featured')}</h2>
            </div>
            <Link to="/catalog">{t('seeAll')}</Link>
          </div>
          <div className="product-grid-react">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>
      <section className="game-teaser">
        <div className="shell game-teaser__inner">
          <div>
            <span className="section-label section-label--light">{c.zone}</span>
            <h2>{c.title}</h2>
            <p>{c.text}</p>
          </div>
          <Link className="light-button" to="/games">
            {t('play')}
          </Link>
          <div className="teaser-grid" aria-hidden="true">
            <i>×</i>
            <i>○</i>
            <i>×</i>
            <i>○</i>
            <i>×</i>
            <i>○</i>
            <i>○</i>
            <i>×</i>
            <i>○</i>
          </div>
        </div>
      </section>
    </>
  );
}
