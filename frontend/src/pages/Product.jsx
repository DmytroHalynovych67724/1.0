import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, imageUrl } from '../api';
import { useStore } from '../store';
import ProductCard from '../components/ProductCard';

const words = {
  pl: {
    loading: 'Ładowanie…',
    missing: 'Nie znaleziono produktu',
    verified: 'zweryfikowany',
    offerTime: 'Oferta będzie ważna przez 48 godzin.',
    safeChat: 'Bezpieczna rozmowa w NaShary',
    negotiated: 'Cena oferty trafia do koszyka po akceptacji',
    history: 'Zweryfikowany stan i historia zamówienia',
    brand: 'Marka',
    state: 'Stan',
    available: 'Dostępne',
    region: 'Region',
    details: 'Parametry techniczne',
    fair: 'Cena rynkowa', great: 'Świetna cena', high: 'Powyżej średniej', watch: 'Obserwuj spadek ceny', watched: 'Obserwowanie włączone', similar: 'Podobne ogłoszenia', recent: 'Ostatnio oglądane', reviews: 'Opinie o sprzedawcy', addReview: 'Oceń sprzedawcę', report: 'Zgłoś ogłoszenie', reported: 'Dziękujemy. Zgłoszenie trafiło do moderacji.', inspection: 'Sprawdzone przez sprzedawcę', faq: 'Przed zakupem', warranty: 'Gwarancja', status: 'Status', negotiable: 'Możliwa negocjacja', modelOffers: 'Porównaj wszystkie oferty tego modelu', icecatSpecs: 'Dane Icecat', icecatDisclaimer: 'Dane są udostępniane „AS IS” i mogą być niepełne lub ulec zmianie.', noReviews: 'Brak opinii', newSeller: 'Nowy sprzedawca', purchaseRequired: 'Sprzedawcę można ocenić po zakończonym zakupie.', alreadyReviewed: 'Ten zakup został już oceniony.', ownListing: 'Nie możesz ocenić własnego ogłoszenia.', reviewHint: 'Ocena dotyczy całej współpracy ze sprzedawcą, nie samego urządzenia.',
  },
  uk: {
    loading: 'Завантаження…',
    missing: 'Товар не знайдено',
    verified: 'перевірений',
    offerTime: 'Пропозиція буде дійсна 48 годин.',
    safeChat: 'Безпечна розмова в NaShary',
    negotiated: 'Погоджена ціна потрапляє до кошика',
    history: 'Перевірений стан та історія замовлення',
    brand: 'Бренд',
    state: 'Стан',
    available: 'В наявності',
    region: 'Регіон',
    details: 'Технічні характеристики',
    fair: 'Ринкова ціна', great: 'Чудова ціна', high: 'Вище середньої', watch: 'Стежити за зниженням', watched: 'Стеження ввімкнено', similar: 'Схожі оголошення', recent: 'Нещодавно переглянуті', reviews: 'Відгуки про продавця', addReview: 'Оцінити продавця', report: 'Поскаржитися', reported: 'Дякуємо. Скаргу передано модерації.', inspection: 'Перевірено продавцем', faq: 'Перед покупкою', warranty: 'Гарантія', status: 'Статус', negotiable: 'Можливий торг', modelOffers: 'Порівняти всі пропозиції цієї моделі', icecatSpecs: 'Дані Icecat', icecatDisclaimer: 'Дані надаються «AS IS» і можуть бути неповними або змінюватися.', noReviews: 'Відгуків ще немає', newSeller: 'Новий продавець', purchaseRequired: 'Продавця можна оцінити після завершеної покупки.', alreadyReviewed: 'Цю покупку вже оцінено.', ownListing: 'Не можна оцінити власне оголошення.', reviewHint: 'Оцінка стосується всієї співпраці з продавцем, а не лише пристрою.',
  },
  en: {
    loading: 'Loading…',
    missing: 'Product not found',
    verified: 'verified',
    offerTime: 'The offer will be valid for 48 hours.',
    safeChat: 'Secure conversation in NaShary',
    negotiated: 'Accepted offer price carries into the cart',
    history: 'Verified condition and order history',
    brand: 'Brand',
    state: 'Condition',
    available: 'Available',
    region: 'Region',
    details: 'Technical specifications',
    fair: 'Market price', great: 'Great price', high: 'Above average', watch: 'Watch price drop', watched: 'Price watch enabled', similar: 'Similar listings', recent: 'Recently viewed', reviews: 'Seller reviews', addReview: 'Rate the seller', report: 'Report listing', reported: 'Thank you. The report was sent to moderation.', inspection: 'Seller-checked', faq: 'Before you buy', warranty: 'Warranty', status: 'Status', negotiable: 'Negotiable', modelOffers: 'Compare all offers for this model', icecatSpecs: 'Icecat data', icecatDisclaimer: 'Data is provided “AS IS” and may be incomplete or change without notice.', noReviews: 'No reviews yet', newSeller: 'New seller', purchaseRequired: 'You can rate the seller after a completed purchase.', alreadyReviewed: 'This purchase has already been reviewed.', ownListing: 'You cannot review your own listing.', reviewHint: 'The rating covers the full experience with the seller, not only the device.',
  },
};

const specWords = {
  screen: { pl: 'Przekątna ekranu', uk: 'Діагональ екрана', en: 'Screen size' },
  processor: { pl: 'Procesor', uk: 'Процесор', en: 'Processor' },
  ram: { pl: 'Pamięć RAM', uk: 'Оперативна пам’ять', en: 'RAM' },
  storage: { pl: 'Pamięć urządzenia', uk: 'Накопичувач', en: 'Storage' },
  gpu: { pl: 'Karta graficzna', uk: 'Відеокарта', en: 'Graphics' },
  os: { pl: 'System operacyjny', uk: 'Операційна система', en: 'Operating system' },
  platform: { pl: 'Platforma', uk: 'Платформа', en: 'Platform' },
  resolution: { pl: 'Rozdzielczość', uk: 'Роздільна здатність', en: 'Resolution' },
  refreshRate: { pl: 'Odświeżanie', uk: 'Частота оновлення', en: 'Refresh rate' },
  displayType: { pl: 'Typ wyświetlacza', uk: 'Тип дисплея', en: 'Display type' },
  displayFeatures: { pl: 'Funkcje wyświetlacza', uk: 'Функції дисплея', en: 'Display features' },
  connectivity: { pl: 'Łączność', uk: 'Підключення', en: 'Connectivity' },
  ramType: { pl: 'Typ pamięci RAM', uk: 'Тип оперативної пам’яті', en: 'RAM type' },
  battery: { pl: 'Pojemność baterii', uk: 'Ємність батареї', en: 'Battery capacity' },
  charging: { pl: 'Moc ładowania', uk: 'Потужність заряджання', en: 'Charging power' },
  mainCamera: { pl: 'Aparat główny', uk: 'Основна камера', en: 'Main camera' },
  frontCamera: { pl: 'Aparat przedni', uk: 'Фронтальна камера', en: 'Front camera' },
  cameraFeatures: { pl: 'Funkcje aparatu', uk: 'Функції камери', en: 'Camera features' },
  features: { pl: 'Dodatkowe funkcje', uk: 'Додаткові функції', en: 'Additional features' },
  sim: { pl: 'Karty SIM', uk: 'SIM-картки', en: 'SIM cards' },
  wifi: { pl: 'Wi-Fi', uk: 'Wi-Fi', en: 'Wi-Fi' },
  bluetooth: { pl: 'Bluetooth', uk: 'Bluetooth', en: 'Bluetooth' },
  weight: { pl: 'Waga', uk: 'Вага', en: 'Weight' },
  accessoryType: { pl: 'Rodzaj akcesorium', uk: 'Тип аксесуара', en: 'Accessory type' },
  audioType: { pl: 'Rodzaj audio', uk: 'Тип аудіо', en: 'Audio type' },
  color: { pl: 'Kolor', uk: 'Колір', en: 'Color' },
};

const inspectionWords = {
  screen: { pl: 'Ekran', uk: 'Екран', en: 'Display' },
  battery: { pl: 'Bateria', uk: 'Батарея', en: 'Battery' },
  cameras: { pl: 'Aparaty', uk: 'Камери', en: 'Cameras' },
  buttons: { pl: 'Przyciski', uk: 'Кнопки', en: 'Buttons' },
  connectivity: { pl: 'Łączność', uk: 'Підключення', en: 'Connectivity' },
  serialNumber: { pl: 'Numer seryjny', uk: 'Серійний номер', en: 'Serial number' },
};

const detailValues = {
  warranty: {
    none: { pl: 'Brak', uk: 'Немає', en: 'None' },
    seller: { pl: 'Sprzedawcy', uk: 'Від продавця', en: 'Seller warranty' },
    manufacturer: { pl: 'Producenta', uk: 'Від виробника', en: 'Manufacturer warranty' },
  },
  status: {
    active: { pl: 'Aktywne', uk: 'Активне', en: 'Active' },
    reserved: { pl: 'Zarezerwowane', uk: 'Зарезервовано', en: 'Reserved' },
    sold: { pl: 'Sprzedane', uk: 'Продано', en: 'Sold' },
    draft: { pl: 'Szkic', uk: 'Чернетка', en: 'Draft' },
  },
};

export default function Product() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, user, formatPrice, addToCart, flash, language } = useStore();
  const c = words[language] || words.pl;
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [offer, setOffer] = useState('');
  const [activeImage, setActiveImage] = useState(0);
  const [related, setRelated] = useState([]);
  const [market, setMarket] = useState(null);
  const [sellerReviews, setSellerReviews] = useState({ rating: null, count: 0, reviews: [] });
  const [reviewEligibility, setReviewEligibility] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [recent, setRecent] = useState([]);
  useEffect(() => {
    api(`/products/${encodeURIComponent(id)}`)
      .then(setProduct)
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [id]);
  useEffect(() => {
    if (!product) return;
    const stored = (() => { try { return JSON.parse(localStorage.getItem('nashary-recent') || '[]'); } catch { return []; } })();
    Promise.all([
      api(`/products/${product.id}/related`).catch(() => []),
      api(`/products/${product.id}/price-history`).catch(() => null),
      product.sellerId
        ? api(`/trust/sellers/${product.sellerId}/reviews`).catch(() => ({ rating: null, count: 0, reviews: [] }))
        : Promise.resolve({ rating: null, count: 0, reviews: [] }),
      user
        ? api(`/trust/products/${product.id}/review-eligibility`).catch(() => null)
        : Promise.resolve(null),
    ]).then(([items, priceData, reviewData, eligibility]) => { setRelated(items); setMarket(priceData); setSellerReviews(reviewData); setReviewEligibility(eligibility); setRecent(stored.filter((item) => item.id !== product.id).slice(0, 4)); });
    localStorage.setItem('nashary-recent', JSON.stringify([product, ...stored.filter((item) => item.id !== product.id)].slice(0, 8)));
    document.title = `${product.title} — NaShary`;
    const script = document.createElement('script'); script.type = 'application/ld+json'; script.dataset.nashary = 'product';
    script.text = JSON.stringify({ '@context': 'https://schema.org', '@type': 'Product', name: product.title, image: product.images, description: product.description, offers: { '@type': 'Offer', price: product.price, priceCurrency: product.currency, availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock' } });
    document.head.querySelector('script[data-nashary="product"]')?.remove(); document.head.appendChild(script);
    return () => script.remove();
  }, [product, user]);
  const watchPrice = async () => {
    if (!user) return navigate('/auth', { state: { from: `/product/${id}` } });
    await api('/marketplace/alerts', { method: 'POST', body: JSON.stringify({ productId: id, targetPrice: Math.round(product.price * 0.9) }) }); flash(c.watched);
  };
  const report = async () => {
    if (!user) return navigate('/auth', { state: { from: `/product/${id}` } });
    const details = window.prompt(c.report) || '';
    if (!details) return;
    await api('/marketplace/reports', { method: 'POST', body: JSON.stringify({ productId: id, reason: 'listing', details }) }); flash(c.reported);
  };
  const submitReview = async (event) => {
    event.preventDefault();
    if (!user) return navigate('/auth', { state: { from: `/product/${id}` } });
    if (!reviewEligibility?.eligible) return flash(c.purchaseRequired);
    await api('/trust/reviews', { method: 'POST', body: JSON.stringify({ orderId: reviewEligibility.orderId, productId: id, rating, comment }) });
    const summary = await api(`/trust/sellers/${product.sellerId}/reviews`);
    setSellerReviews(summary);
    setReviewEligibility({ eligible: false, reason: 'already_reviewed' });
    setComment('');
  };
  const openChat = async (withOffer = false) => {
    if (!user) return navigate('/auth', { state: { from: `/product/${id}` } });
    try {
      const conversation = await api('/chats', {
        method: 'POST',
        body: JSON.stringify({ productId: id }),
      });
      if (withOffer && Number(offer) > 0)
        await api(`/chats/${conversation.id}/offers`, {
          method: 'POST',
          body: JSON.stringify({ amount: Number(offer) }),
        });
      navigate(`/account?tab=messages&conversation=${conversation.id}`);
    } catch (error) {
      flash(error.message);
    }
  };
  if (loading) return <div className="shell page-loader">{c.loading}</div>;
  if (!product)
    return (
      <div className="shell empty-panel">
        <h1>{c.missing}</h1>
        <Link to="/catalog">{t('continue')}</Link>
      </div>
    );
  return (
    <div className="product-page-react">
      <div className="shell breadcrumbs">
        <Link to="/catalog">{t('catalog')}</Link>
        <span>/</span>
        <span>{product.category}</span>
      </div>
      <div className="shell product-react-grid">
        <section className="product-gallery-react">
          <div className="product-main-image">
            <img src={imageUrl(product.images?.[activeImage])} alt={product.title} />
            <span className={`condition condition--${product.condition}`}>
              {t(product.condition === 'new' ? 'new' : 'used')}
            </span>
          </div>
          {product.images?.length > 1 && (
            <div className="product-thumbs">
              {product.images.slice(0, 8).map((image, index) => (
                <button className={activeImage === index ? 'is-active' : ''} type="button" key={`${image}-${index}`} onClick={() => setActiveImage(index)}><img src={imageUrl(image)} alt="" /></button>
              ))}
            </div>
          )}
        </section>
        <aside className="buy-panel">
          <span className="product-kicker">
            {product.category} · {product.location}
          </span>
          <h1>{product.title}</h1>
          <Link className="model-offers-link" to={`/model/${encodeURIComponent(product.brand)}/${encodeURIComponent(product.model)}`}>{c.modelOffers}</Link>
          <div className="seller-line">
            <span className="avatar">
              {product.sellerAvatar ? (
                <img src={product.sellerAvatar} alt="" />
              ) : (
                product.seller?.[0] || 'N'
              )}
            </span>
            <div>
              <small>{t('seller')}</small>
              <b>{product.seller}</b>
            </div>
            {product.sellerVerified && <em>✓ {c.verified}</em>}
          </div>
          <div className="seller-rating">
            <span>{sellerReviews.rating ?? product.sellerRating ? `★ ${Number(sellerReviews.rating ?? product.sellerRating).toFixed(1)}` : c.newSeller}</span>
            <small>{(sellerReviews.count || product.sellerReviewCount) > 0 ? `${sellerReviews.count || product.sellerReviewCount} ${language === 'pl' ? 'opinii' : language === 'uk' ? 'відгуків' : 'reviews'}` : c.noReviews}</small>
          </div>
          <div className="buy-price">
            {formatPrice(product.price, product.currency)}
            {product.oldPrice ? <del>{formatPrice(product.oldPrice, product.currency)}</del> : null}
          </div>
          {market && <div className={`price-verdict price-verdict--${market.verdict}`}><b>{market.verdict === 'great' ? c.great : market.verdict === 'high' ? c.high : c.fair}</b><span>{formatPrice(market.median, product.currency)}</span></div>}
          <button
            className="primary-button primary-button--wide"
            disabled={product.stock < 1}
            type="button"
            onClick={() => addToCart(product)}
          >
            {t('add')}
          </button>
          <button className="watch-price-button" type="button" onClick={watchPrice}>♡ {c.watch}</button>
          <button
            className="quiet-button quiet-button--wide"
            type="button"
            onClick={() => openChat(false)}
          >
            {t('message')}
          </button>
          <div className="offer-box">
            <label>
              {t('negotiate')}
              <div>
                <input
                  inputMode="decimal"
                  value={offer}
                  onChange={(event) => setOffer(event.target.value)}
                  placeholder={String(Math.round(product.price * 0.9))}
                />
                <button type="button" onClick={() => openChat(true)}>
                  →
                </button>
              </div>
            </label>
            <small>{c.offerTime}</small>
          </div>
          <ul className="purchase-points">
            <li>✓ {c.safeChat}</li>
            <li>✓ {c.negotiated}</li>
            <li>✓ {c.history}</li>
          </ul>
        </aside>
      </div>
      <div className={`shell product-info-react${product.description?.trim() ? '' : ' product-info-react--specs-only'}`}>
        {product.description?.trim() && <section className="product-description-card">
          <span className="section-label">{t('description')}</span>
          <h2>{t('description')}</h2>
          <p>{product.description}</p>
        </section>}
        <section>
          <span className="section-label">Info</span>
          <h2>{c.details}</h2>
          <dl>
            <div>
              <dt>{c.brand}</dt>
              <dd>{product.brand}</dd>
            </div>
            <div>
              <dt>{c.state}</dt>
              <dd>{t(product.condition === 'new' ? 'new' : 'used')}</dd>
            </div>
            <div>
              <dt>{c.available}</dt>
              <dd>{product.stock}</dd>
            </div>
            <div>
              <dt>{c.region}</dt>
              <dd>{product.region?.toUpperCase()}</dd>
            </div>
            <div><dt>{c.warranty}</dt><dd>{detailValues.warranty[product.warranty]?.[language] || product.warranty}</dd></div>
            <div><dt>{c.status}</dt><dd>{detailValues.status[product.status]?.[language] || product.status}</dd></div>
            {product.negotiable && <div><dt>{c.negotiable}</dt><dd>✓</dd></div>}
            {Object.entries(product.specs || {}).map(([key, value]) => (
              <div key={key}>
                <dt>{specWords[key]?.[language] || key}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          {product.deviceDetails?.specSource === 'icecat' && <p className="icecat-attribution"><a href="https://icecat.biz/" target="_blank" rel="noreferrer">{c.icecatSpecs}</a><span> · {c.icecatDisclaimer} </span><a href="https://icecat.biz/en/menu/disclaimer" target="_blank" rel="noreferrer">ⓘ</a></p>}
        </section>
      </div>
      {product.inspectionScore > 0 && <section className="shell inspection-panel"><div><span>{product.inspectionScore}/6</span><h2>{c.inspection}</h2></div><ul>{Object.entries(product.inspection).map(([key, value]) => <li className={value ? 'is-ok' : ''} key={key}>{value ? '✓' : '–'} {inspectionWords[key]?.[language] || key}</li>)}</ul></section>}
      <section className="shell model-reviews-section seller-reviews-section">
        <header>
          <div><span className="section-label">Trust</span><h2>{c.reviews}</h2><p>{c.reviewHint}</p></div>
          <strong>{sellerReviews.rating ? `${Number(sellerReviews.rating).toFixed(1)} ★` : '—'}</strong>
        </header>
        <div className="model-reviews-grid">
          {sellerReviews.reviews.slice(0, 6).map((review) => <article key={review.id}><b>{review.buyerName}</b><span>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span><p>{review.comment}</p></article>)}
          {!sellerReviews.reviews.length && <div className="seller-review-empty"><b>{c.noReviews}</b><p>{c.reviewHint}</p></div>}
          {reviewEligibility?.eligible ? <form onSubmit={submitReview}><label>{c.addReview}<select value={rating} onChange={(event) => setRating(Number(event.target.value))}>{[5,4,3,2,1].map((value) => <option key={value} value={value}>{value} ★</option>)}</select></label><textarea required maxLength="500" value={comment} onChange={(event) => setComment(event.target.value)} /><button className="primary-button" type="submit">{c.addReview}</button></form> : <div className="seller-review-locked"><span>{reviewEligibility?.reason === 'already_reviewed' ? '✓' : 'i'}</span><p>{reviewEligibility?.reason === 'already_reviewed' ? c.alreadyReviewed : reviewEligibility?.reason === 'own_listing' ? c.ownListing : c.purchaseRequired}</p></div>}
        </div>
      </section>
      <section className="shell product-faq"><span className="section-label">FAQ</span><h2>{c.faq}</h2><details><summary>{language === 'pl' ? 'Jak bezpiecznie sprawdzić urządzenie?' : language === 'uk' ? 'Як безпечно перевірити пристрій?' : 'How to inspect the device safely?'}</summary><p>{language === 'pl' ? 'Sprawdź numer seryjny, baterię, ekran, aparaty i wykonaj płatność przez zapisane zamówienie.' : language === 'uk' ? 'Перевірте серійний номер, батарею, екран, камери та оплачуйте через оформлене замовлення.' : 'Check the serial number, battery, display and cameras, then pay through a recorded order.'}</p></details><details><summary>{language === 'pl' ? 'Co daje weryfikacja?' : language === 'uk' ? 'Що дає верифікація?' : 'What does verification mean?'}</summary><p>{language === 'pl' ? 'Potwierdza profil sprzedawcy, ale nadal warto zachować standardowe zasady bezpieczeństwa.' : language === 'uk' ? 'Вона підтверджує профіль продавця, але стандартних правил безпеки все одно слід дотримуватися.' : 'It confirms the seller profile, while normal safety rules still apply.'}</p></details></section>
      {related.length > 0 && <section className="shell product-recommendations"><header><h2>{c.similar}</h2></header><div className="product-grid-react">{related.slice(0, 4).map((item) => <ProductCard key={item.id} product={item} />)}</div></section>}
      {recent.length > 0 && <section className="shell product-recommendations"><header><h2>{c.recent}</h2></header><div className="product-grid-react">{recent.map((item) => <ProductCard key={item.id} product={item} />)}</div></section>}
      <div className="shell report-listing"><button type="button" onClick={report}>⚑ {c.report}</button></div>
    </div>
  );
}
