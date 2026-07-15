import { useState } from 'react';
import { Link } from 'react-router-dom';
import { imageUrl } from '../api';
import { useStore } from '../store';

const copy = {
  pl: { compare: 'Porównaj', low: 'Ostatnie sztuki', verified: 'Zweryfikowany', quick: 'Szybki podgląd', urgent: 'Pilne', reserved: 'Zarezerwowane', model: 'Wszystkie oferty modelu' },
  uk: { compare: 'Порівняти', low: 'Останні одиниці', verified: 'Перевірений', quick: 'Швидкий перегляд', urgent: 'Терміново', reserved: 'Зарезервовано', model: 'Усі пропозиції моделі' },
  en: { compare: 'Compare', low: 'Low stock', verified: 'Verified', quick: 'Quick view', urgent: 'Urgent', reserved: 'Reserved', model: 'All model offers' },
};

const specLabels = {
  screen: { pl: 'Ekran', uk: 'Екран', en: 'Screen' },
  processor: { pl: 'Procesor', uk: 'Процесор', en: 'Processor' },
  ram: { pl: 'RAM', uk: 'RAM', en: 'RAM' },
  storage: { pl: 'Pamięć', uk: 'Накопичувач', en: 'Storage' },
  gpu: { pl: 'Grafika', uk: 'Відеокарта', en: 'Graphics' },
  os: { pl: 'System', uk: 'Система', en: 'System' },
  platform: { pl: 'Platforma', uk: 'Платформа', en: 'Platform' },
  resolution: { pl: 'Rozdzielczość', uk: 'Роздільна здатність', en: 'Resolution' },
  refreshRate: { pl: 'Odświeżanie', uk: 'Частота', en: 'Refresh rate' },
  connectivity: { pl: 'Łączność', uk: 'Підключення', en: 'Connectivity' },
  accessoryType: { pl: 'Rodzaj', uk: 'Тип', en: 'Type' },
  audioType: { pl: 'Rodzaj', uk: 'Тип', en: 'Type' },
  color: { pl: 'Kolor', uk: 'Колір', en: 'Color' },
};

export default function ProductCard({ product, view = 'grid', onQuickView }) {
  const {
    t,
    formatPrice,
    addToCart,
    favorites,
    toggleFavorite,
    comparison,
    toggleCompare,
    language,
  } = useStore();
  const c = copy[language] || copy.pl;
  const sold = product.stock < 1 || product.status === 'sold';
  const images = product.images?.length ? product.images : [''];
  const [activeImage, setActiveImage] = useState(0);
  const compared = comparison.some((item) => item.id === product.id);
  const favorite = favorites.includes(product.id);
  const specs = Object.entries(product.specs || {}).slice(0, view === 'list' ? 5 : 3);
  const selectImage = (event) => {
    if (images.length < 2) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const position = Math.max(0, Math.min(0.999, (event.clientX - bounds.left) / bounds.width));
    setActiveImage(Math.floor(position * images.length));
  };

  return (
    <article className={`product-card-react product-card-react--${view}`}>
      <div className="product-card-react__media">
        <Link
          to={`/product/${product.id}`}
          onMouseMove={selectImage}
          onMouseLeave={() => setActiveImage(0)}
        >
          <img src={imageUrl(images[activeImage])} alt={product.title} />
        </Link>
        <span className={`condition condition--${product.condition}`}>
          {t(product.condition === 'new' ? 'new' : 'used')}
        </span>
        <div className="product-card-actions">
          {onQuickView && (
            <button className="quick-card-button" type="button" onClick={() => onQuickView(product)} aria-label={c.quick} title={c.quick}>⌕</button>
          )}
          <button
            className={`compare-card-button${compared ? ' is-active' : ''}`}
            type="button"
            onClick={() => toggleCompare(product)}
            aria-label={c.compare}
            title={c.compare}
          >
            ◫
          </button>
          <button
            className={`heart${favorite ? ' is-active' : ''}`}
            type="button"
            onClick={() => toggleFavorite(product.id)}
            aria-label={favorite ? (language === 'pl' ? 'Usuń z ulubionych' : language === 'uk' ? 'Видалити з обраного' : 'Remove from favourites') : (language === 'pl' ? 'Dodaj do ulubionych' : language === 'uk' ? 'Додати до обраного' : 'Add to favourites')}
            aria-pressed={favorite}
          >
            {favorite ? '♥' : '♡'}
          </button>
        </div>
        {images.length > 1 && (
          <div className="product-image-dots" aria-hidden="true">
            {images.map((_, index) => (
              <i className={index === activeImage ? 'is-active' : ''} key={index} />
            ))}
          </div>
        )}
      </div>
      <div className="product-card-react__body">
        <span className="product-kicker">
          {product.category} · {product.location}
        </span>
        <Link className="product-title" to={`/product/${product.id}`}>
          {product.title}
        </Link>
        {product.model && <Link className="product-model-link" to={`/model/${encodeURIComponent(product.brand)}/${encodeURIComponent(product.model)}`}>{c.model}</Link>}
        <div className="product-card-badges">
          {product.urgent && <span className="is-urgent">{c.urgent}</span>}
          {product.status === 'reserved' && <span>{c.reserved}</span>}
          {product.sellerVerified && <span>{c.verified}</span>}
          {!sold && product.stock <= 2 && <span className="is-low">{c.low}</span>}
        </div>
        {specs.length > 0 && (
          <dl className="product-card-specs">
            {specs.map(([key, value]) => (
              <div key={key}>
                <dt>{specLabels[key]?.[language] || key}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        )}
        <div className="product-card-buy">
          <div className="product-price">
            <strong>{formatPrice(product.price, product.currency)}</strong>
            {product.oldPrice ? <del>{formatPrice(product.oldPrice, product.currency)}</del> : null}
          </div>
          <button
            className="primary-button"
            type="button"
            disabled={sold}
            onClick={() => addToCart(product)}
          >
            {sold ? t('out') : t('add')}
          </button>
        </div>
      </div>
    </article>
  );
}
