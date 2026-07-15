import { createPortal } from 'react-dom';
import { imageUrl } from '../api';
import { useStore } from '../store';

const copy = {
  pl: {
    title: 'Porównanie produktów',
    close: 'Zamknij',
    clear: 'Wyczyść',
    price: 'Cena',
    condition: 'Stan',
    stock: 'Dostępność',
    region: 'Region',
    new: 'Nowy',
    used: 'Używany',
  },
  uk: {
    title: 'Порівняння товарів',
    close: 'Закрити',
    clear: 'Очистити',
    price: 'Ціна',
    condition: 'Стан',
    stock: 'Наявність',
    region: 'Регіон',
    new: 'Новий',
    used: 'Вживаний',
  },
  en: {
    title: 'Product comparison',
    close: 'Close',
    clear: 'Clear',
    price: 'Price',
    condition: 'Condition',
    stock: 'Stock',
    region: 'Region',
    new: 'New',
    used: 'Used',
  },
};

const specLabels = {
  screen: { pl: 'Przekątna ekranu', uk: 'Діагональ екрана', en: 'Screen size' },
  processor: { pl: 'Procesor', uk: 'Процесор', en: 'Processor' },
  ram: { pl: 'Pamięć RAM', uk: 'Оперативна пам’ять', en: 'RAM' },
  storage: { pl: 'Pamięć urządzenia', uk: 'Накопичувач', en: 'Storage' },
  gpu: { pl: 'Karta graficzna', uk: 'Відеокарта', en: 'Graphics' },
  os: { pl: 'System operacyjny', uk: 'Операційна система', en: 'Operating system' },
  platform: { pl: 'Platforma', uk: 'Платформа', en: 'Platform' },
  resolution: { pl: 'Rozdzielczość', uk: 'Роздільна здатність', en: 'Resolution' },
  refreshRate: { pl: 'Odświeżanie', uk: 'Частота оновлення', en: 'Refresh rate' },
  connectivity: { pl: 'Łączność', uk: 'Підключення', en: 'Connectivity' },
  accessoryType: { pl: 'Rodzaj akcesorium', uk: 'Тип аксесуара', en: 'Accessory type' },
  audioType: { pl: 'Rodzaj audio', uk: 'Тип аудіо', en: 'Audio type' },
  color: { pl: 'Kolor', uk: 'Колір', en: 'Color' },
};

export default function ComparePanel({ onClose }) {
  const { comparison, toggleCompare, clearComparison, formatPrice, language } = useStore();
  const c = copy[language] || copy.pl;
  const specKeys = [...new Set(comparison.flatMap((product) => Object.keys(product.specs || {})))];

  return createPortal(
    <div className="compare-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="compare-panel"
        role="dialog"
        aria-modal="true"
        aria-label={c.title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <span className="section-label">NaShary compare</span>
            <h2>{c.title}</h2>
          </div>
          <div className="compare-panel__actions">
            <button type="button" onClick={clearComparison}>
              {c.clear}
            </button>
            <button type="button" onClick={onClose} aria-label={c.close}>
              ×
            </button>
          </div>
        </header>
        <div className="compare-table-wrap">
          <div className="compare-table" style={{ '--compare-columns': comparison.length || 1 }}>
            <div className="compare-label" />
            {comparison.map((product) => (
              <article className="compare-product" key={product.id}>
                <button type="button" onClick={() => toggleCompare(product)} aria-label={c.clear}>
                  ×
                </button>
                <img src={imageUrl(product.images?.[0])} alt="" />
                <b>{product.title}</b>
              </article>
            ))}
            <CompareRow label={c.price} products={comparison}>
              {(product) => formatPrice(product.price, product.currency)}
            </CompareRow>
            <CompareRow label={c.condition} products={comparison}>
              {(product) => (product.condition === 'new' ? c.new : c.used)}
            </CompareRow>
            <CompareRow label={c.stock} products={comparison}>
              {(product) => product.stock}
            </CompareRow>
            <CompareRow label={c.region} products={comparison}>
              {(product) => product.region?.toUpperCase()}
            </CompareRow>
            {specKeys.map((key) => (
              <CompareRow
                key={key}
                label={specLabels[key]?.[language] || key}
                products={comparison}
              >
                {(product) => product.specs?.[key] || '—'}
              </CompareRow>
            ))}
          </div>
        </div>
      </section>
    </div>,
    document.body
  );
}

function CompareRow({ label, products, children }) {
  return (
    <>
      <div className="compare-label">{label}</div>
      {products.map((product) => (
        <div className="compare-value" key={`${label}-${product.id}`}>
          {children(product)}
        </div>
      ))}
    </>
  );
}
