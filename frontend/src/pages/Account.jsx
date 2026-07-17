import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { api, imageUrl } from '../api';
import { deliveryNames, localized, paymentNames } from '../checkoutOptions';
import { useStore } from '../store';
import MarketplaceCenter from '../components/MarketplaceCenter';

const blankListing = {
  title: '',
  description: '',
  price: '',
  category: 'Smartfony',
  location: 'Warszawa',
  condition: 'used',
  brand: '',
  stock: 1,
  image: '',
  images: [],
  delivery: 'both',
  specs: {},
  model: '', warranty: 'none', negotiable: true, urgent: false, status: 'active',
  inspection: { screen: false, battery: false, cameras: false, buttons: false, connectivity: false, serialNumber: false },
  deviceDetails: { batteryHealth: '', display: '', body: '', completeness: '', defects: '', grade: 'B', serialChecked: false, specSource: '', specSourceId: '' },
};

const listingCategories = [
  'Smartfony',
  'Laptopy',
  'Tablety',
  'Gaming',
  'Audio',
  'Monitory',
  'Foto',
  'Akcesoria',
];
const listingSpecs = {
  Smartfony: ['color', 'screen', 'displayType', 'resolution', 'refreshRate', 'displayFeatures', 'processor', 'ram', 'ramType', 'storage', 'battery', 'charging', 'mainCamera', 'frontCamera', 'cameraFeatures', 'features', 'sim', 'os', 'connectivity', 'wifi', 'bluetooth', 'weight'],
  Laptopy: ['color', 'screen', 'displayType', 'resolution', 'refreshRate', 'processor', 'ram', 'ramType', 'storage', 'gpu', 'battery', 'os', 'connectivity', 'wifi', 'bluetooth', 'weight'],
  Tablety: ['color', 'screen', 'displayType', 'resolution', 'refreshRate', 'processor', 'ram', 'storage', 'battery', 'charging', 'os', 'connectivity', 'wifi', 'bluetooth', 'weight'],
  Gaming: ['color', 'platform', 'processor', 'ram', 'storage', 'gpu', 'resolution', 'refreshRate', 'connectivity', 'wifi', 'bluetooth'],
  Audio: ['color', 'audioType', 'connectivity', 'bluetooth', 'battery', 'charging', 'features', 'weight'],
  Monitory: ['color', 'screen', 'displayType', 'resolution', 'refreshRate', 'displayFeatures', 'connectivity', 'features'],
  Foto: ['color', 'resolution', 'displayType', 'connectivity', 'wifi', 'bluetooth', 'features', 'weight'],
  Akcesoria: ['color', 'accessoryType', 'connectivity', 'bluetooth', 'battery', 'charging', 'features', 'weight'],
};
const listingSpecLabels = {
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
  displayType: { pl: 'Matryca ekranu', uk: 'Матриця екрана', en: 'Display type' },
  battery: { pl: 'Pojemność baterii', uk: 'Ємність батареї', en: 'Battery capacity' },
  charging: { pl: 'Moc ładowania', uk: 'Потужність заряджання', en: 'Charging power' },
  mainCamera: { pl: 'Aparat główny', uk: 'Основна камера', en: 'Main camera' },
  frontCamera: { pl: 'Aparat przedni', uk: 'Фронтальна камера', en: 'Front camera' },
  weight: { pl: 'Waga', uk: 'Вага', en: 'Weight' },
  cameraFeatures: { pl: 'Funkcje aparatu', uk: 'Особливості камери', en: 'Camera features' },
  features: { pl: 'Funkcje i możliwości', uk: 'Функції та можливості', en: 'Features' },
  sim: { pl: 'Karty SIM', uk: 'SIM-карти', en: 'SIM cards' },
  wifi: { pl: 'Wi‑Fi', uk: 'Wi‑Fi', en: 'Wi-Fi' },
  bluetooth: { pl: 'Wersja Bluetooth', uk: 'Версія Bluetooth', en: 'Bluetooth version' },
  displayFeatures: { pl: 'Funkcje wyświetlacza', uk: 'Особливості дисплея', en: 'Display features' },
  ramType: { pl: 'Typ pamięci RAM', uk: 'Тип оперативної пам’яті', en: 'RAM type' },
};
const words = {
  pl: {
    hello: 'Dzień dobry',
    overview: 'Przegląd',
    listings: 'Ogłoszenia',
    orders: 'Zamówienia',
    messages: 'Wiadomości',
    saved: 'Zapisane', moderation: 'Moderacja',
    add: 'Nowe ogłoszenie',
    emptyListings: 'Nie masz jeszcze własnych ogłoszeń.',
    emptyOrders: 'Nie masz jeszcze zamówień.',
    emptyChats: 'Rozmowy ze sprzedawcami i kupującymi pojawią się tutaj.',
    edit: 'Edytuj',
    remove: 'Usuń',
    save: 'Zapisz ogłoszenie',
    cancel: 'Anuluj',
    send: 'Wyślij',
    offer: 'Zaproponuj cenę',
    accept: 'Akceptuj',
    reject: 'Odrzuć',
    sellerZone: 'Twoja strefa sprzedaży',
    accountText: 'Ogłoszenia, zamówienia i negocjacje w jednym spokojnym miejscu.',
    title: 'Nazwa',
    price: 'Cena',
    quantity: 'Liczba sztuk',
    brand: 'Marka',
    category: 'Kategoria',
    condition: 'Stan',
    used: 'Używany',
    new: 'Nowy',
    location: 'Lokalizacja',
    image: 'URL zdjęcia (opcjonalnie)',
    description: 'Opis',
    newChat: 'Nowa rozmowa',
    negotiation: 'Negocjacja',
    proposal: 'Oferta',
    messagePlaceholder: 'Napisz wiadomość…',
    deleteConfirm: 'Usunąć ogłoszenie?',
    pieces: 'szt.',
    sellerInfo: 'Dodawaj i edytuj oferty, kontroluj stan magazynowy.',
    orderInfo: 'Historia zakupów, ceny po negocjacji i status realizacji.',
    chatInfo: 'Bezpieczny czat i uporządkowane propozycje cenowe.',
    avatar: 'Zmień zdjęcie',
    avatarSaved: 'Zdjęcie profilowe zapisane.',
    deleteMessage: 'Usuń wiadomość',
    model: 'Rozpoznany model', autoSpecs: 'Pobierz dane modelu', searchingSpecs: 'Rozpoznaję model i pobieram parametry…', chooseModel: 'Wybierz znaleziony model', noSpecs: 'Nie rozpoznano modelu. Uzupełnij markę, model i parametry ręcznie.', specsApplied: 'Model rozpoznany — dane techniczne uzupełniono automatycznie.', photos: 'Zdjęcia (maks. 8)', photoHint: 'Kliknij lub przeciągnij pliki JPG, PNG albo WebP. Pierwsze zdjęcie będzie główne.', warranty: 'Gwarancja', negotiable: 'Cena do negocjacji', urgent: 'Pilne ogłoszenie', status: 'Status ogłoszenia', inspection: 'Co zostało sprawdzone?', active: 'Aktywne', reserved: 'Zarezerwowane', sold: 'Sprzedane', draft: 'Szkic', deviceState: 'Szczegółowy stan', batteryHealth: 'Kondycja baterii %', displayState: 'Stan ekranu', bodyState: 'Stan obudowy', completeness: 'Zestaw', defects: 'Wady i usterki', grade: 'Klasa stanu', serialChecked: 'Numer seryjny sprawdzony',
  },
  uk: {
    hello: 'Вітаємо',
    overview: 'Огляд',
    listings: 'Оголошення',
    orders: 'Замовлення',
    messages: 'Повідомлення',
    saved: 'Збережене', moderation: 'Модерація',
    add: 'Нове оголошення',
    emptyListings: 'У вас ще немає власних оголошень.',
    emptyOrders: 'У вас ще немає замовлень.',
    emptyChats: 'Діалоги з продавцями й покупцями з’являться тут.',
    edit: 'Редагувати',
    remove: 'Видалити',
    save: 'Зберегти оголошення',
    cancel: 'Скасувати',
    send: 'Надіслати',
    offer: 'Запропонувати ціну',
    accept: 'Прийняти',
    reject: 'Відхилити',
    sellerZone: 'Ваша зона продажів',
    accountText: 'Оголошення, покупки й торг в одному спокійному місці.',
    title: 'Назва',
    price: 'Ціна',
    quantity: 'Кількість',
    brand: 'Бренд',
    category: 'Категорія',
    condition: 'Стан',
    used: 'Вживаний',
    new: 'Новий',
    location: 'Локація',
    image: 'URL фото (необов’язково)',
    description: 'Опис',
    newChat: 'Нова розмова',
    negotiation: 'Торг',
    proposal: 'Пропозиція',
    messagePlaceholder: 'Напишіть повідомлення…',
    deleteConfirm: 'Видалити оголошення?',
    pieces: 'шт.',
    sellerInfo: 'Додавайте й редагуйте пропозиції та контролюйте залишки.',
    orderInfo: 'Історія покупок, погоджені ціни та статус виконання.',
    chatInfo: 'Безпечний чат і впорядковані цінові пропозиції.',
    avatar: 'Змінити фото',
    avatarSaved: 'Фото профілю збережено.',
    deleteMessage: 'Видалити повідомлення',
    model: 'Розпізнана модель', autoSpecs: 'Завантажити дані моделі', searchingSpecs: 'Розпізнаю модель і завантажую характеристики…', chooseModel: 'Оберіть знайдену модель', noSpecs: 'Модель не розпізнано. Заповніть бренд, модель і параметри вручну.', specsApplied: 'Модель розпізнано — характеристики заповнено автоматично.', photos: 'Фотографії (до 8)', photoHint: 'Натисніть або перетягніть JPG, PNG чи WebP. Перше фото буде головним.', warranty: 'Гарантія', negotiable: 'Можливий торг', urgent: 'Термінове оголошення', status: 'Статус оголошення', inspection: 'Що було перевірено?', active: 'Активне', reserved: 'Зарезервовано', sold: 'Продано', draft: 'Чернетка', deviceState: 'Детальний стан', batteryHealth: 'Стан батареї %', displayState: 'Стан екрана', bodyState: 'Стан корпусу', completeness: 'Комплектація', defects: 'Дефекти', grade: 'Клас стану', serialChecked: 'Серійний номер перевірено',
  },
  en: {
    hello: 'Hello',
    overview: 'Overview',
    listings: 'Listings',
    orders: 'Orders',
    messages: 'Messages',
    saved: 'Saved', moderation: 'Moderation',
    add: 'New listing',
    emptyListings: 'You do not have any listings yet.',
    emptyOrders: 'You do not have any orders yet.',
    emptyChats: 'Conversations with sellers and buyers will appear here.',
    edit: 'Edit',
    remove: 'Delete',
    save: 'Save listing',
    cancel: 'Cancel',
    send: 'Send',
    offer: 'Make an offer',
    accept: 'Accept',
    reject: 'Reject',
    sellerZone: 'Your selling space',
    accountText: 'Listings, orders and negotiations in one calm place.',
    title: 'Title',
    price: 'Price',
    quantity: 'Quantity',
    brand: 'Brand',
    category: 'Category',
    condition: 'Condition',
    used: 'Used',
    new: 'New',
    location: 'Location',
    image: 'Image URL (optional)',
    description: 'Description',
    newChat: 'New conversation',
    negotiation: 'Negotiation',
    proposal: 'Offer',
    messagePlaceholder: 'Write a message…',
    deleteConfirm: 'Delete this listing?',
    pieces: 'pcs.',
    sellerInfo: 'Add and edit listings and manage stock.',
    orderInfo: 'Purchase history, negotiated prices and fulfilment status.',
    chatInfo: 'Secure chat and structured price offers.',
    avatar: 'Change photo',
    avatarSaved: 'Profile photo saved.',
    deleteMessage: 'Delete message',
    model: 'Recognized model', autoSpecs: 'Fetch model data', searchingSpecs: 'Recognizing model and fetching specifications…', chooseModel: 'Choose a matching model', noSpecs: 'Model not recognized. Enter brand, model and specifications manually.', specsApplied: 'Model recognized — specifications filled automatically.', photos: 'Photos (up to 8)', photoHint: 'Click or drop JPG, PNG or WebP files. The first photo is the cover.', warranty: 'Warranty', negotiable: 'Negotiable price', urgent: 'Urgent listing', status: 'Listing status', inspection: 'What did you check?', active: 'Active', reserved: 'Reserved', sold: 'Sold', draft: 'Draft', deviceState: 'Detailed condition', batteryHealth: 'Battery health %', displayState: 'Display condition', bodyState: 'Body condition', completeness: 'Included items', defects: 'Defects', grade: 'Condition grade', serialChecked: 'Serial number checked',
  },
};

export const accountWords = words;

const orderGiftLabels = {
  pl: { care_kit: 'Zestaw do czyszczenia', eco_pack: 'Opakowanie ochronne', usb_c_cable: 'Kabel USB‑C', device_inspection: 'Bezpłatna kontrola urządzenia' },
  uk: { care_kit: 'Набір для чищення', eco_pack: 'Захисне пакування', usb_c_cable: 'Кабель USB‑C', device_inspection: 'Безкоштовна перевірка пристрою' },
  en: { care_kit: 'Care kit', eco_pack: 'Protective packaging', usb_c_cable: 'USB‑C cable', device_inspection: 'Free device inspection' },
};

const paymentStatusLabels = {
  awaiting_payment: { pl: 'Oczekuje na płatność', uk: 'Очікує на оплату', en: 'Awaiting payment' },
  awaiting_transfer: { pl: 'Oczekuje na przelew', uk: 'Очікує на переказ', en: 'Awaiting transfer' },
  due_on_delivery: { pl: 'Płatność przy odbiorze', uk: 'Оплата при отриманні', en: 'Payment on collection' },
  paid: { pl: 'Opłacone', uk: 'Оплачено', en: 'Paid' },
};

const inspectionLabels = {
  pl: { screen: 'Ekran działa prawidłowo', battery: 'Bateria sprawdzona', cameras: 'Aparaty sprawdzone', buttons: 'Przyciski działają', connectivity: 'Wi‑Fi i sieć działają', serialNumber: 'IMEI / numer seryjny sprawdzony' },
  uk: { screen: 'Екран працює справно', battery: 'Батарею перевірено', cameras: 'Камери перевірено', buttons: 'Кнопки працюють', connectivity: 'Wi‑Fi та мережа працюють', serialNumber: 'IMEI / серійний номер перевірено' },
  en: { screen: 'Display works correctly', battery: 'Battery checked', cameras: 'Cameras checked', buttons: 'Buttons work', connectivity: 'Wi-Fi and network work', serialNumber: 'IMEI / serial number checked' },
};

export function ListingForm({ initial, onClose, onSaved, region, language, c, page = false }) {
  const [form, setForm] = useState(
    initial
      ? { ...blankListing, ...initial, specs: initial.specs || {}, images: initial.images || [], inspection: { ...blankListing.inspection, ...(initial.inspection || {}) }, deviceDetails: { ...blankListing.deviceDetails, ...(initial.deviceDetails || {}) } }
      : blankListing
  );
  const [busy, setBusy] = useState(false);
  const [specsBusy, setSpecsBusy] = useState(false);
  const [specMatches, setSpecMatches] = useState([]);
  const [selectedSpecKey, setSelectedSpecKey] = useState('');
  const [specNotice, setSpecNotice] = useState('');
  const lastLookup = useRef('');
  const lookupSequence = useRef(0);
  const change = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const changeSpec = (field, value) =>
    setForm((current) => {
      const specs = { ...current.specs };
      if (value) specs[field] = value;
      else delete specs[field];
      return { ...current, specs };
    });
  const addPhotoFiles = async (selectedFiles) => {
    const files = [...selectedFiles].slice(0, 8 - form.images.length);
    const acceptable = files.filter((file) => file.size <= 750_000 && /^image\/(png|jpeg|webp)$/.test(file.type));
    const encoded = await Promise.all(acceptable.map((file) => new Promise((resolve) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.readAsDataURL(file); })));
    setForm((current) => ({ ...current, images: [...current.images, ...encoded].slice(0, 8) }));
  };
  const addPhotos = async (event) => {
    await addPhotoFiles(event.target.files);
    event.target.value = '';
  };
  const specKey = (match) => String(match.icecatId || `${match.source}:${match.title}`);
  const applySpecMatch = useCallback((match, query) => {
    const storage = query.match(/\b(32|64|128|256|512|1024)\s*(GB|ГБ|TB|ТБ)\b/i);
    setSelectedSpecKey(specKey(match));
    setForm((current) => ({
      ...current,
      brand: match.brand || current.brand,
      model: match.model || current.model,
      specs: {
        ...match.specs,
        ...(storage ? { storage: `${storage[1]} ${/tb|тб/i.test(storage[2]) ? 'TB' : 'GB'}` } : {}),
        ...(current.specs?.color ? { color: current.specs.color } : {}),
      },
      deviceDetails: {
        ...current.deviceDetails,
        specSource: match.source === 'Open Icecat' ? 'icecat' : match.source?.toLowerCase() || '',
        specSourceId: match.source === 'Open Icecat' ? String(match.icecatId || '') : '',
      },
    }));
  }, []);
  useEffect(() => {
    const query = form.title.trim();
    if (initial || query.length < 5 || query === lastLookup.current) return undefined;
    const timer = window.setTimeout(async () => {
      const requestId = lookupSequence.current + 1;
      lookupSequence.current = requestId;
      lastLookup.current = query;
      setSpecsBusy(true);
      setSpecNotice('');
      try {
        const data = await api(`/device-specs?q=${encodeURIComponent(query)}&category=${encodeURIComponent(form.category)}&language=${encodeURIComponent(language)}`);
        if (requestId !== lookupSequence.current) return;
        const matches = data.results || [];
        if (!matches.length) {
          setSpecMatches([]);
          setSelectedSpecKey('');
          setSpecNotice(c.noSpecs);
          return;
        }
        setSpecMatches(matches);
        const requestedStorage = query.match(/\b(32|64|128|256|512|1024)\s*(?:GB|ГБ|TB|ТБ)\b/i)?.[1];
        const match = matches.find((item) => requestedStorage && String(item.specs?.storage || '').includes(requestedStorage)) || matches[0];
        if (match.matchConfidence === 'fallback') {
          setSelectedSpecKey('');
          setSpecNotice(c.chooseModel);
        } else {
          applySpecMatch(match, query);
          setSpecNotice(c.specsApplied);
        }
      } catch (error) {
        if (requestId !== lookupSequence.current) return;
        setSpecNotice(error.message);
      } finally {
        if (requestId === lookupSequence.current) setSpecsBusy(false);
      }
    }, 650);
    return () => {
      window.clearTimeout(timer);
      lookupSequence.current += 1;
    };
  }, [applySpecMatch, c.chooseModel, c.noSpecs, c.specsApplied, form.category, form.title, initial, language]);
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    const payload = {
      ...form,
      price: Number(form.price),
      stock: Number(form.stock),
      images: form.images || [],
      region,
    };
    delete payload.id;
    delete payload.currency;
    delete payload.createdAt;
    delete payload.updatedAt;
    delete payload.priceCents;
    delete payload.createdBy;
    try {
      const saved = await api(initial ? `/products/${initial.id}` : '/products', {
        method: initial ? 'PATCH' : 'POST',
        body: JSON.stringify(payload),
      });
      onSaved(saved);
      if (!page) onClose();
    } catch (error) {
      window.alert(error.message);
    } finally {
      setBusy(false);
    }
  };
  const formContent = (
      <form className={`listing-modal${page ? ' listing-page-form' : ''}`} onSubmit={submit}>
        <div className="modal-title">
          <div>
            <span className="eyebrow">NaShary Seller</span>
            <h2>{initial ? c.edit : c.add}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label={c.cancel}>
            {page ? '←' : '×'}
          </button>
        </div>
        <div className="form-grid-react">
          <label className="span-2 listing-title-field">
            {c.title}
            <input
              required
              minLength="3"
              value={form.title}
              onChange={(event) => {
                setSpecMatches([]);
                setSelectedSpecKey('');
                setSpecNotice('');
                lastLookup.current = '';
                change('title', event.target.value);
              }}
              placeholder={language === 'pl' ? 'np. Apple iPhone 15 Pro 256 GB' : language === 'uk' ? 'наприклад Apple iPhone 15 Pro 256 GB' : 'e.g. Apple iPhone 15 Pro 256 GB'}
            />
            <small className={`auto-spec-status${specsBusy ? ' is-loading' : ''}`}>{specsBusy ? c.searchingSpecs : specNotice}</small>
          </label>
          <label>
            {c.price}
            <input
              required
              type="number"
              min="1"
              step="0.01"
              value={form.price}
              onChange={(event) => change('price', event.target.value)}
            />
          </label>
          <label>
            {c.quantity}
            <input
              required
              type="number"
              min="0"
              value={form.stock}
              onChange={(event) => change('stock', event.target.value)}
            />
          </label>
          <label className="auto-resolved-field">
            {c.brand}
            <input
              required
              readOnly={Boolean(selectedSpecKey)}
              value={form.brand}
              onChange={(event) => change('brand', event.target.value)}
            />
          </label>
          <div className="listing-model-field auto-resolved-field">
            <label>{c.model}<input required readOnly={Boolean(selectedSpecKey)} value={form.model} onChange={(event) => change('model', event.target.value)} /></label>
          </div>
          {specMatches.length > 0 && <div className="span-2 spec-lookup-results" aria-label={c.chooseModel}>{specMatches.slice(0, 4).map((match) => <button className={`spec-match-card${selectedSpecKey === specKey(match) ? ' is-selected' : ''}`} type="button" key={specKey(match)} onClick={() => { applySpecMatch(match, form.title); setSpecNotice(c.specsApplied); }}><span>{selectedSpecKey === specKey(match) ? '✓' : '＋'}</span><div><b>{match.title}</b><small>{match.source} · {Object.keys(match.specs || {}).length} {language === 'pl' ? 'parametrów' : language === 'uk' ? 'характеристик' : 'specifications'}{match.specs?.storage ? ` · ${match.specs.storage}` : ''}</small></div></button>)}</div>}
          <label>
            {c.category}
            <select
              required
              value={form.category}
              onChange={(event) => {
                setSpecMatches([]);
                setSelectedSpecKey('');
                setSpecNotice('');
                lastLookup.current = '';
                setForm((current) => ({ ...current, category: event.target.value, specs: {}, deviceDetails: { ...current.deviceDetails, specSource: '', specSourceId: '' } }));
              }}
            >
              {listingCategories.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </label>
          <label>
            {c.condition}
            <select
              value={form.condition}
              onChange={(event) => change('condition', event.target.value)}
            >
              <option value="used">{c.used}</option>
              <option value="new">{c.new}</option>
            </select>
          </label>
          <label>
            {c.location}
            <input
              required
              value={form.location}
              onChange={(event) => change('location', event.target.value)}
            />
          </label>
          <div className="span-2 listing-photo-field"><span className="listing-field-label">{c.photos}</span><label className="photo-dropzone" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); addPhotoFiles(event.dataTransfer.files); }}><input type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={addPhotos} /><i>＋</i><b>{language === 'pl' ? 'Dodaj zdjęcia urządzenia' : language === 'uk' ? 'Додайте фотографії пристрою' : 'Add device photos'}</b><small>{c.photoHint}</small></label>{form.images.length > 0 && <div className="listing-photo-grid">{form.images.map((image, index) => <figure key={`${image.slice(0, 30)}-${index}`}><img src={imageUrl(image)} alt="" /><button type="button" onClick={() => change('images', form.images.filter((_, itemIndex) => itemIndex !== index))}>×</button>{index === 0 && <span>Cover</span>}</figure>)}</div>}</div>
          <label>{c.warranty}<select value={form.warranty} onChange={(event) => change('warranty', event.target.value)}><option value="none">—</option><option value="seller">Seller</option><option value="manufacturer">Manufacturer</option></select></label>
          <label>{c.status}<select value={form.status} onChange={(event) => change('status', event.target.value)}>{['active','reserved','sold','draft'].map((value) => <option key={value} value={value}>{c[value]}</option>)}</select></label>
          <label className="check-filter"><input type="checkbox" checked={form.negotiable} onChange={(event) => change('negotiable', event.target.checked)} /><span>{c.negotiable}</span></label>
          <label className="check-filter"><input type="checkbox" checked={form.urgent} onChange={(event) => change('urgent', event.target.checked)} /><span>{c.urgent}</span></label>
          <fieldset className="span-2 inspection-form"><legend>{c.inspection}</legend><p>{language === 'pl' ? 'Zaznacz tylko to, co naprawdę zostało sprawdzone.' : language === 'uk' ? 'Позначте лише те, що справді перевірено.' : 'Select only what you have actually checked.'}</p>{Object.keys(blankListing.inspection).map((key) => <label className="check-filter" key={key}><input type="checkbox" checked={Boolean(form.inspection?.[key])} onChange={(event) => change('inspection', { ...form.inspection, [key]: event.target.checked })}/><span>{inspectionLabels[language]?.[key] || inspectionLabels.pl[key]}</span></label>)}</fieldset>
          {form.condition === 'used' && <fieldset className="span-2 device-details-form"><legend>{c.deviceState}</legend><label>{c.batteryHealth}<input type="number" min="1" max="100" value={form.deviceDetails.batteryHealth} onChange={(event) => change('deviceDetails', { ...form.deviceDetails, batteryHealth: Number(event.target.value) })}/></label><label>{c.grade}<select value={form.deviceDetails.grade} onChange={(event) => change('deviceDetails', { ...form.deviceDetails, grade: event.target.value })}>{['A','B','C','D'].map((item) => <option key={item}>{item}</option>)}</select></label><label>{c.displayState}<input value={form.deviceDetails.display} onChange={(event) => change('deviceDetails', { ...form.deviceDetails, display: event.target.value })}/></label><label>{c.bodyState}<input value={form.deviceDetails.body} onChange={(event) => change('deviceDetails', { ...form.deviceDetails, body: event.target.value })}/></label><label>{c.completeness}<input value={form.deviceDetails.completeness} onChange={(event) => change('deviceDetails', { ...form.deviceDetails, completeness: event.target.value })}/></label><label>{c.defects}<input value={form.deviceDetails.defects} onChange={(event) => change('deviceDetails', { ...form.deviceDetails, defects: event.target.value })}/></label><label className="check-filter"><input type="checkbox" checked={Boolean(form.deviceDetails.serialChecked)} onChange={(event) => change('deviceDetails', { ...form.deviceDetails, serialChecked: event.target.checked })}/><span>{c.serialChecked}</span></label></fieldset>}
          {(listingSpecs[form.category] || []).length > 0 && <details className="span-2 auto-spec-review" open={!specMatches.length}>
            <summary><span>{language === 'pl' ? 'Dane techniczne' : language === 'uk' ? 'Технічні характеристики' : 'Technical specifications'}</span><small>{Object.values(form.specs || {}).filter(Boolean).length} / {(listingSpecs[form.category] || []).length}</small></summary>
            <div className="form-grid-react">{(listingSpecs[form.category] || []).map((key) => (
              <label key={key}>
                {listingSpecLabels[key][language] || listingSpecLabels[key].pl}
                <input value={form.specs?.[key] || ''} onChange={(event) => changeSpec(key, event.target.value)} />
              </label>
            ))}</div>
          </details>}
          <label className="span-2">
            {c.description}
            <textarea
              rows="5"
              value={form.description}
              onChange={(event) => change('description', event.target.value)}
            />
          </label>
        </div>
        <div className="modal-actions">
          <button className="quiet-button" type="button" onClick={onClose}>
            {c.cancel}
          </button>
          <button className="primary-button" disabled={busy} type="submit">
            {busy ? '…' : c.save}
          </button>
        </div>
      </form>
  );
  if (page) return <main className="sell-page shell"><div className="sell-page-intro"><span className="eyebrow">NaShary Seller</span><h1>{c.add}</h1><p>{language === 'pl' ? 'Wpisz nazwę urządzenia. Dane techniczne uzupełnimy automatycznie, a Ty dodasz stan, cenę i własne zdjęcia.' : language === 'uk' ? 'Введіть назву пристрою. Характеристики ми заповнимо автоматично, а ви додасте стан, ціну та власні фото.' : 'Enter the device name. We will fill in the technical data; you add condition, price and photos.'}</p></div>{formContent}</main>;
  return createPortal(<div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>{formContent}</div>, document.body);
}

function Messages({ conversations, c, user, formatPrice, preferred, language, onConversationUpdate }) {
  const [selected, setSelected] = useState(preferred || conversations[0]?.id || null);
  const [thread, setThread] = useState(null);
  const [message, setMessage] = useState('');
  const [amount, setAmount] = useState('');
  const [offerOpen, setOfferOpen] = useState(false);
  const chatScroll = useRef(null);
  const activeId = selected || conversations[0]?.id || null;
  const activeConversation = conversations.find((item) => item.id === activeId) || thread?.conversation;
  const otherName = activeConversation?.buyerId === user.id ? activeConversation?.sellerName : activeConversation?.buyerName;
  const otherAvatar = activeConversation?.buyerId === user.id ? activeConversation?.sellerAvatar : activeConversation?.buyerAvatar;
  const locale = language === 'uk' ? 'uk-UA' : language === 'en' ? 'en-GB' : 'pl-PL';
  const ui = {
    online: language === 'uk' ? 'Активний діалог' : language === 'en' ? 'Active conversation' : 'Aktywna rozmowa',
    empty: language === 'uk' ? 'Напишіть перше повідомлення про цей товар.' : language === 'en' ? 'Send the first message about this listing.' : 'Napisz pierwszą wiadomość o tym ogłoszeniu.',
    offer: language === 'uk' ? 'Запропонувати ціну' : language === 'en' ? 'Make a price offer' : 'Zaproponuj cenę',
    cancelOffer: language === 'uk' ? 'Скасувати' : language === 'en' ? 'Cancel' : 'Anuluj',
    openProduct: language === 'uk' ? 'Відкрити товар' : language === 'en' ? 'Open listing' : 'Otwórz ogłoszenie',
    statuses: {
      pending: language === 'uk' ? 'Очікує відповіді' : language === 'en' ? 'Awaiting response' : 'Oczekuje na odpowiedź',
      accepted: language === 'uk' ? 'Прийнято' : language === 'en' ? 'Accepted' : 'Zaakceptowana',
      rejected: language === 'uk' ? 'Відхилено' : language === 'en' ? 'Rejected' : 'Odrzucona',
      expired: language === 'uk' ? 'Термін минув' : language === 'en' ? 'Expired' : 'Wygasła',
      countered: language === 'uk' ? 'Замінено новою' : language === 'en' ? 'Countered' : 'Zmieniona kontrofertą',
    },
  };
  const time = (value) => value ? new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : '';
  const load = useCallback(
    () => activeId && api(`/chats/${activeId}/messages`).then(setThread),
    [activeId]
  );
  useEffect(() => {
    load();
    const interval = window.setInterval(load, 15000);
    return () => window.clearInterval(interval);
  }, [load]);
  useEffect(() => {
    if (chatScroll.current) chatScroll.current.scrollTop = chatScroll.current.scrollHeight;
  }, [thread]);
  const send = async (event) => {
    event.preventDefault();
    if (!message.trim()) return;
    const body = message.trim();
    setMessage('');
    const saved = await api(`/chats/${activeId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    });
    setThread((current) => current ? { ...current, messages: [...current.messages, saved] } : current);
    onConversationUpdate?.();
  };
  const offer = async (event) => {
    event.preventDefault();
    if (!amount) return;
    const saved = await api(`/chats/${activeId}/offers`, {
      method: 'POST',
      body: JSON.stringify({ amount: Number(amount) }),
    });
    setAmount('');
    setOfferOpen(false);
    setThread((current) => current ? { ...current, offers: [...current.offers, saved] } : current);
    onConversationUpdate?.();
  };
  const respond = async (offerId, action) => {
    await api(`/chats/${activeId}/offers/${offerId}`, {
      method: 'PATCH',
      body: JSON.stringify({ action }),
    });
    setThread((current) => current ? { ...current, offers: current.offers.map((item) => item.id === offerId ? { ...item, status: action === 'accept' ? 'accepted' : 'rejected' } : item) } : current);
    onConversationUpdate?.();
  };
  const removeMessage = async (messageId) => {
    await api(`/chats/${activeId}/messages/${messageId}`, { method: 'DELETE' });
    setThread((current) => current ? { ...current, messages: current.messages.filter((item) => item.id !== messageId) } : current);
    onConversationUpdate?.();
  };
  if (!conversations.length)
    return (
      <div className="account-empty">
        <span>↔</span>
        <p>{c.emptyChats}</p>
      </div>
    );
  return (
    <div className="messages-layout">
      <aside className="conversation-list">
        {conversations.map((conversation) => (
          <button
            className={activeId === conversation.id ? 'is-active' : ''}
            type="button"
            key={conversation.id}
            onClick={() => { setThread(null); setSelected(conversation.id); }}
          >
            <span className="conversation-avatar">{(conversation.buyerId === user.id ? conversation.sellerAvatar : conversation.buyerAvatar) ? <img src={conversation.buyerId === user.id ? conversation.sellerAvatar : conversation.buyerAvatar} alt="" /> : (conversation.buyerId === user.id ? conversation.sellerName : conversation.buyerName)?.[0]?.toUpperCase()}</span>
            <span className="conversation-preview"><span><b>{conversation.buyerId === user.id ? conversation.sellerName : conversation.buyerName}</b><time>{time(conversation.lastMessageAt || conversation.updatedAt)}</time></span><small>{conversation.productTitle}</small><em>{conversation.lastMessage || c.newChat}</em></span>
            {conversation.unreadCount > 0 && <i className="conversation-unread">{conversation.unreadCount}</i>}
          </button>
        ))}
      </aside>
      <section className="chat-thread">
        <header className="chat-person-header">
          <span className="conversation-avatar conversation-avatar--large">{otherAvatar ? <img src={otherAvatar} alt="" /> : otherName?.[0]?.toUpperCase()}</span>
          <div><h3>{otherName || '…'}</h3><small><i />{ui.online}</small></div>
          {activeConversation?.productId && <Link to={`/product/${activeConversation.productId}`} title={ui.openProduct}><span>{activeConversation.productTitle}</span><strong>{activeConversation.productPrice ? formatPrice(activeConversation.productPrice, activeConversation.productCurrency) : '↗'}</strong></Link>}
        </header>
        <div className="chat-scroll" ref={chatScroll}>
          {!thread && <div className="chat-loading"><i /><i /><i /></div>}
          {thread && !thread.messages?.length && !thread.offers?.length && <div className="chat-empty-state"><span>✦</span><p>{ui.empty}</p></div>}
          {[...(thread?.messages || []).map((item) => ({ ...item, timelineType: 'message' })), ...(thread?.offers || []).map((item) => ({ ...item, timelineType: 'offer' }))].sort((a, b) => a.createdAt - b.createdAt).map((item) => item.timelineType === 'message' ? (
            <div className={`chat-bubble ${item.senderId === user.id ? 'is-mine' : ''}`} key={`message-${item.id}`}><p>{item.body}</p><span>{time(item.createdAt)}{item.senderId === user.id ? ` · ${item.readAt ? '✓✓' : '✓'}` : ''}</span>{item.senderId === user.id && <button className="message-delete" type="button" title={c.deleteMessage} onClick={() => removeMessage(item.id)}>⌫</button>}</div>
          ) : (
            <div className={`offer-card ${item.createdBy === user.id ? 'is-mine' : ''} is-${item.status}`} key={`offer-${item.id}`}><span>{c.proposal}<small>{ui.statuses[item.status] || item.status}</small></span><strong>{formatPrice(item.amount, item.currency)}</strong><time>{time(item.createdAt)}</time>{item.recipientId === user.id && item.status === 'pending' && <div><button type="button" onClick={() => respond(item.id, 'accept')}>{c.accept}</button><button type="button" onClick={() => respond(item.id, 'reject')}>{c.reject}</button></div>}</div>
          ))}
        </div>
        {offerOpen && <form className="offer-form" onSubmit={offer}><span>€</span><input type="number" min="1" placeholder={c.price} value={amount} onChange={(event) => setAmount(event.target.value)} autoFocus /><button type="button" onClick={() => setOfferOpen(false)}>{ui.cancelOffer}</button><button type="submit" disabled={!amount}>{c.offer}</button></form>}
        <form className="message-form" onSubmit={send}>
          <button className="message-tool" type="button" onClick={() => setOfferOpen((value) => !value)} aria-label={ui.offer} title={ui.offer}>€</button>
          <textarea rows="1" placeholder={c.messagePlaceholder} value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} />
          <button className="message-emoji" type="button" onClick={() => setMessage((value) => `${value}🙂`)} aria-label="Emoji">☺</button>
          <button className="message-send" type="submit" disabled={!message.trim()} aria-label={c.send}>↑</button>
        </form>
      </section>
    </div>
  );
}

export default function Account() {
  const { user, language, region, formatPrice, signOut, updateProfile, flash, t } = useStore();
  const c = words[language] || words.pl;
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'overview';
  const [listings, setListings] = useState([]);
  const [orders, setOrders] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [editing, setEditing] = useState(undefined);
  const avatarInput = useRef(null);
  const uploadAvatar = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 700_000)
      return flash('Max 700 KB · JPG, PNG, WebP');
    const avatar = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    try {
      const result = await api('/auth/me', { method: 'PATCH', body: JSON.stringify({ avatar }) });
      updateProfile(result.user);
      flash(c.avatarSaved);
    } catch (error) {
      flash(error.message);
    }
    event.target.value = '';
  };
  const refresh = useCallback(() => {
    if (!user) return;
    Promise.all([api('/products/mine'), api('/orders'), api('/chats')]).then(
      ([mine, orderList, chatList]) => {
        setListings(mine);
        setOrders(orderList);
        setConversations(chatList);
      }
    );
  }, [user]);
  useEffect(() => {
    refresh();
  }, [refresh]);
  if (!user) return <Navigate to="/auth" state={{ from: '/account' }} replace />;
  const remove = async (id) => {
    if (!window.confirm(c.deleteConfirm)) return;
    await api(`/products/${id}`, { method: 'DELETE' });
    setListings((items) => items.filter((item) => item.id !== id));
  };
  const nav = [
    ['overview', c.overview],
    ['listings', c.listings],
    ['orders', c.orders],
    ['messages', c.messages],
    ['saved', c.saved],
    ...(user.role === 'admin' ? [['moderation', c.moderation]] : []),
  ];
  return (
    <main className="account-page shell">
      <header className="account-hero">
        <div className="account-identity">
          <button
            className="profile-avatar"
            type="button"
            onClick={() => avatarInput.current?.click()}
            title={c.avatar}
          >
            {user.avatar ? (
              <img src={user.avatar} alt="" />
            ) : (
              <span>{user.username[0].toUpperCase()}</span>
            )}
            <i>＋</i>
          </button>
          <input
            ref={avatarInput}
            className="visually-hidden"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={uploadAvatar}
          />
          <div>
            <span className="eyebrow">NaShary ID</span>
            <h1>
              {c.hello}, {user.username}
            </h1>
            <p>{c.accountText}</p>
          </div>
        </div>
        <button className="quiet-button" type="button" onClick={signOut}>
          {t('logout')}
        </button>
      </header>
      <nav className="account-tabs">
        {nav.map(([id, label]) => (
          <button
            className={tab === id ? 'is-active' : ''}
            type="button"
            key={id}
            onClick={() => setParams({ tab: id })}
          >
            {label}
            <span>
              {id === 'listings'
                ? listings.length
                : id === 'orders'
                  ? orders.length
                  : id === 'messages'
                    ? conversations.length
                    : ''}
            </span>
          </button>
        ))}
      </nav>
      {tab === 'overview' && (
        <section className="account-overview">
          <article>
            <span className="metric">{listings.length}</span>
            <h2>{c.sellerZone}</h2>
            <p>{c.sellerInfo}</p>
            <button
              className="text-button"
              type="button"
              onClick={() => setParams({ tab: 'listings' })}
            >
              {c.listings} →
            </button>
          </article>
          <article>
            <span className="metric">{orders.length}</span>
            <h2>{c.orders}</h2>
            <p>{c.orderInfo}</p>
            <button
              className="text-button"
              type="button"
              onClick={() => setParams({ tab: 'orders' })}
            >
              {c.orders} →
            </button>
          </article>
          <article className="overview-dark">
            <span className="metric">{conversations.length}</span>
            <h2>{c.messages}</h2>
            <p>{c.chatInfo}</p>
            <button
              className="text-button"
              type="button"
              onClick={() => setParams({ tab: 'messages' })}
            >
              {c.messages} →
            </button>
          </article>
        </section>
      )}
      {tab === 'listings' && (
        <section className="account-section">
          <div className="section-title">
            <div>
              <span className="eyebrow">Seller</span>
              <h2>{c.listings}</h2>
            </div>
            <Link className="primary-button" to="/sell">
              ＋ {c.add}
            </Link>
          </div>
          {!listings.length ? (
            <div className="account-empty">
              <span>＋</span>
              <p>{c.emptyListings}</p>
            </div>
          ) : (
            <div className="listing-table">
              {listings.map((item) => (
                <article key={item.id}>
                  <img src={imageUrl(item.images?.[0])} alt="" />
                  <div>
                    <Link to={`/product/${item.id}`}>{item.title}</Link>
                    <small>
                      {item.condition === 'new' ? c.new : c.used} · {item.stock} {c.pieces}
                    </small>
                  </div>
                  <strong>{formatPrice(item.price, item.currency)}</strong>
                  <div className="row-actions">
                    <button title={c.edit} type="button" onClick={() => setEditing(item)}>
                      ✎
                    </button>
                    <button title={c.remove} type="button" onClick={() => remove(item.id)}>
                      ×
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
      {tab === 'orders' && (
        <section className="account-section">
          <div className="section-title">
            <div>
              <span className="eyebrow">History</span>
              <h2>{c.orders}</h2>
            </div>
          </div>
          {!orders.length ? (
            <div className="account-empty">
              <span>□</span>
              <p>{c.emptyOrders}</p>
            </div>
          ) : (
            <div className="orders-grid">
              {orders.map((order) => (
                <article key={order.id}>
                  <header>
                    <span>#{order.id.slice(0, 8)}</span>
                    <b>{order.status}</b>
                  </header>
                  {order.items.map((item) => (
                    <div className="order-item" key={item.id}>
                      <img src={imageUrl(item.image)} alt="" />
                      <span>
                        {item.title}
                        <small>
                          {item.qty} × {formatPrice(item.price, item.currency)}
                        </small>
                      </span>
                    </div>
                  ))}
                  {order.checkout?.deliveryOption && <div className="order-fulfillment">
                    <span><small>{language === 'uk' ? 'Доставка' : language === 'en' ? 'Delivery' : 'Dostawa'}</small><b>{localized(deliveryNames, order.checkout.deliveryOption, language)}</b></span>
                    <span><small>{language === 'uk' ? 'Оплата' : language === 'en' ? 'Payment' : 'Płatność'}</small><b>{localized(paymentNames, order.checkout.paymentMethod, language)}</b></span>
                    <em>{localized(paymentStatusLabels, order.checkout.paymentStatus, language)}</em>
                  </div>}
                  {(order.discount > 0 || order.shipping > 0 || order.rewardGift) && <dl className="order-benefits">
                    {order.discount > 0 && <div><dt>Promo</dt><dd>−{formatPrice(order.discount, order.currency)}</dd></div>}
                    {order.shipping > 0 && <div><dt>{language === 'uk' ? 'Доставка' : language === 'en' ? 'Delivery' : 'Dostawa'}</dt><dd>{order.shippingDiscount > 0 ? <><s>{formatPrice(order.shipping, order.currency)}</s> {formatPrice(0, order.currency)}</> : formatPrice(order.shipping, order.currency)}</dd></div>}
                    {order.rewardGift && <div className="is-gift"><dt>{language === 'uk' ? 'Подарунок' : language === 'en' ? 'Gift' : 'Prezent'}</dt><dd>{orderGiftLabels[language]?.[order.rewardGift] || order.rewardGift}</dd></div>}
                  </dl>}
                  <footer>
                    <small>{new Date(order.createdAt).toLocaleDateString()}</small>
                    <strong>{formatPrice(order.total, order.currency)}</strong>
                  </footer>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
      {tab === 'messages' && (
        <section className="account-section account-section--messages">
          <div className="section-title">
            <div>
              <span className="eyebrow">Chat & offers</span>
              <h2>{c.messages}</h2>
            </div>
          </div>
          <Messages
            conversations={conversations}
            c={c}
            user={user}
            formatPrice={formatPrice}
            preferred={params.get('conversation')}
            language={language}
            onConversationUpdate={refresh}
          />
        </section>
      )}
      {tab === 'saved' && <section className="account-section"><MarketplaceCenter /></section>}
      {tab === 'moderation' && user.role === 'admin' && <section className="account-section"><MarketplaceCenter admin /></section>}
      {editing !== undefined && (
        <ListingForm
          initial={editing}
          region={region}
          language={language}
          c={c}
          onClose={() => setEditing(undefined)}
          onSaved={(saved) =>
            setListings((items) =>
              editing
                ? items.map((item) => (item.id === saved.id ? saved : item))
                : [saved, ...items]
            )
          }
        />
      )}
    </main>
  );
}
