import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { api, imageUrl } from '../api';
import { useStore } from '../store';

const words = {
  pl: { title: 'Szybki podgląd', details: 'Pełne ogłoszenie', chat: 'Napisz', alert: 'Obserwuj cenę', saved: 'Obserwowanie ceny włączone', condition: 'Stan', delivery: 'Dostawa', trade: 'Możliwa negocjacja', both: 'Dostawa lub odbiór', shipping: 'Dostawa', pickup: 'Odbiór osobisty' },
  uk: { title: 'Швидкий перегляд', details: 'Повне оголошення', chat: 'Написати', alert: 'Стежити за ціною', saved: 'Стеження за ціною ввімкнено', condition: 'Стан', delivery: 'Доставка', trade: 'Можливий торг', both: 'Доставка або самовивіз', shipping: 'Доставка', pickup: 'Самовивіз' },
  en: { title: 'Quick view', details: 'Full listing', chat: 'Message', alert: 'Watch price', saved: 'Price watch enabled', condition: 'Condition', delivery: 'Delivery', trade: 'Negotiable', both: 'Delivery or pickup', shipping: 'Delivery', pickup: 'Pickup' },
};

const specLabels = {
  screen: { pl: 'Ekran', uk: 'Екран', en: 'Display' }, displayType: { pl: 'Matryca', uk: 'Матриця', en: 'Panel' },
  resolution: { pl: 'Rozdzielczość', uk: 'Роздільна здатність', en: 'Resolution' }, refreshRate: { pl: 'Odświeżanie', uk: 'Частота оновлення', en: 'Refresh rate' },
  processor: { pl: 'Procesor', uk: 'Процесор', en: 'Processor' }, ram: { pl: 'Pamięć RAM', uk: 'Оперативна пам’ять', en: 'RAM' },
  storage: { pl: 'Pamięć', uk: 'Накопичувач', en: 'Storage' }, battery: { pl: 'Bateria', uk: 'Батарея', en: 'Battery' },
  gpu: { pl: 'Grafika', uk: 'Відеокарта', en: 'Graphics' }, connectivity: { pl: 'Łączność', uk: 'Підключення', en: 'Connectivity' },
};

export default function QuickView({ product, onClose }) {
  const { language, formatPrice, addToCart, user, flash, t } = useStore();
  const c = words[language] || words.pl;
  const navigate = useNavigate();
  const [image, setImage] = useState(0);
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [onClose]);
  const watch = async () => {
    if (!user) return navigate('/auth', { state: { from: '/catalog' } });
    await api('/marketplace/alerts', { method: 'POST', body: JSON.stringify({ productId: product.id, targetPrice: Math.round(product.price * 0.9) }) });
    flash(c.saved);
  };
  const chat = async () => {
    if (!user) return navigate('/auth', { state: { from: `/product/${product.id}` } });
    const conversation = await api('/chats', { method: 'POST', body: JSON.stringify({ productId: product.id }) });
    navigate(`/account?tab=messages&conversation=${conversation.id}`);
  };
  const images = product.images?.length ? product.images : [''];
  return createPortal(
    <div className="modal-backdrop quick-view-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <article className="quick-view-modal" role="dialog" aria-modal="true" aria-label={c.title}>
        <header><span>{c.title}</span><button type="button" onClick={onClose}>×</button></header>
        <div className="quick-view-grid">
          <div className="quick-view-gallery">
            <img src={imageUrl(images[image])} alt={product.title} />
            {images.length > 1 && <div>{images.map((item, index) => <button className={image === index ? 'is-active' : ''} type="button" key={`${item}-${index}`} onClick={() => setImage(index)}><img src={imageUrl(item)} alt="" /></button>)}</div>}
          </div>
          <div className="quick-view-info">
            <small>{product.category} · {product.location}</small>
            <h2>{product.title}</h2>
            <strong>{formatPrice(product.price, product.currency)}</strong>
            <dl><div><dt>{c.condition}</dt><dd>{t(product.condition === 'new' ? 'new' : 'used')}</dd></div><div><dt>{c.delivery}</dt><dd>{c[product.delivery] || product.delivery}</dd></div>{product.negotiable && <div><dt>{c.trade}</dt><dd>✓</dd></div>}{Object.entries(product.specs || {}).slice(0, 4).map(([key, value]) => <div key={key}><dt>{specLabels[key]?.[language] || key}</dt><dd>{value}</dd></div>)}</dl>
            <div className="quick-view-actions"><button className="primary-button" type="button" onClick={() => addToCart(product)}>{t('add')}</button><button className="quiet-button" type="button" onClick={chat}>{c.chat}</button></div>
            <button className="text-button" type="button" onClick={watch}>♡ {c.alert}</button>
            <Link to={`/product/${product.id}`}>{c.details}</Link>
          </div>
        </div>
      </article>
    </div>,
    document.body
  );
}
