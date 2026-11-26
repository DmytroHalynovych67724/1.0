import { preparePhoto } from '../preparePhoto';
import { photoCopy } from '../photoPolicy.mjs';
import { specLabels as listingSpecLabels } from '../specLabels.mjs';
import SellerSales, { salesCopy } from '../components/SellerSales';
import SellerInventory from '../components/SellerInventory';
import { canListNew, initialListingCondition } from '../sellerInventory.mjs';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { api, imageUrl } from '../api';
import { deliveryNames, localized, paymentNames } from '../checkoutOptions';
import { useStore } from '../store';
import MarketplaceCenter from '../components/MarketplaceCenter';
import AccountSettings from '../components/AccountSettings';
import StaffPanel from '../components/StaffPanel';
import { accountCopy } from '../accountCopy';
import { mergeDetectedSpecs } from '../specAutofill.mjs';
import { categoryLabel } from '../catalogTaxonomy';
import { specCopy } from '../specCopy';
import { aiSpecCopy } from '../aiSpecCopy';
import { selectSpecLookupResult } from '../specLookupSelection.mjs';
import AccountAccess, { accessLabel } from '../components/AccountAccess';
import SupplyFields from '../components/SupplyFields';
import UsedConditionFields from '../components/UsedConditionFields';
import { newSellerCopy, supplyCopy } from '../supplyDetails.mjs';

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
  supplyDetails: {},
  model: '', warranty: 'none', negotiable: true, urgent: false, status: 'active',
  inspection: { screen: false, battery: false, cameras: false, buttons: false, connectivity: false, serialNumber: false },
  deviceDetails: { batteryHealth: '', display: '', body: '', completeness: '', defects: '', grade: '', serialChecked: false, specSource: '', specSourceId: '' },
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



export function ListingForm({ initial, initialCondition, onClose, onSaved, region, language, c, page = false }) {
  const { user } = useStore();
  const canSellNew = canListNew(user);
  const sellerCopy = newSellerCopy[language] || newSellerCopy.pl;
  const supply = supplyCopy[language] || supplyCopy.pl;
  const sc = specCopy[language] || specCopy.pl;
  const ac = aiSpecCopy[language] || aiSpecCopy.pl;
  const specInputPrefix = useId();
  const [form, setForm] = useState(
    initial
      ? { ...blankListing, ...initial, specs: initial.specs || {}, images: initial.images || [], inspection: { ...blankListing.inspection, ...(initial.inspection || {}) }, deviceDetails: { ...blankListing.deviceDetails, ...(initial.deviceDetails || {}) } }
      : { ...blankListing, condition: initialListingCondition(user, initialCondition) }
  );
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [photosBusy, setPhotosBusy] = useState(false);
  const [photoNotice, setPhotoNotice] = useState('');
  const photosGate = useRef(false);
  const pc = photoCopy[language] || photoCopy.pl;
  const [specsBusy, setSpecsBusy] = useState(false);
  const [specMatches, setSpecMatches] = useState([]);
  const [selectedSpecKey, setSelectedSpecKey] = useState('');
  const [specNotice, setSpecNotice] = useState('');
  const [lookupAttempt, setLookupAttempt] = useState(0);
  const [lookupQuery, setLookupQuery] = useState('');
  const [lookupMode, setLookupMode] = useState('sources');
  const [specMetadata, setSpecMetadata] = useState(null);
  const [replaceSpecs, setReplaceSpecs] = useState(false);
  const replaceSpecsRef = useRef(false);
  const manualSpecKeys = useRef(new Set(initial ? Object.keys(initial.specs || {}) : []));
  const lastLookup = useRef('');
  const lookupSequence = useRef(0);
  const change = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const changeSpec = (field, value) => {
    manualSpecKeys.current.add(field);
    setForm((current) => {
      const specs = { ...current.specs };
      if (value) specs[field] = value;
      else delete specs[field];
      return { ...current, specs };
    });
  };
  const addPhotoFiles = async (selectedFiles) => {
    if (photosGate.current) return;
    const selected = [...selectedFiles];
    const remaining = 8 - form.images.length;
    if (!selected.length) return;
    if (remaining <= 0) { setPhotoNotice(pc.limit); return; }
    photosGate.current = true; setPhotosBusy(true); setPhotoNotice(pc.busy);
    const files = selected.slice(0, remaining);
    const encoded = [];
    const problems = new Set();
    if (selected.length > files.length) problems.add(pc.limit);
    try {
      for (let index = 0; index < files.length; index += 1) {
        setPhotoNotice(`${pc.busy} ${index + 1}/${files.length}`);
        try { encoded.push(await preparePhoto(files[index])); }
        catch (error) { problems.add(pc[error.message] || pc.decode); }
      }
      setForm((current) => ({ ...current, images: [...current.images, ...encoded].slice(0, 8) }));
      const skipped = selected.length - encoded.length;
      setPhotoNotice(`${pc.added}: ${encoded.length}.${skipped ? ` ${pc.skipped}: ${skipped}.` : ''} ${[...problems].join(' ')}`);
    } finally { photosGate.current = false; setPhotosBusy(false); }
  };
  const addPhotos = async (event) => {
    const input = event.target;
    await addPhotoFiles(input.files);
    input.value = '';
  };
  const specKey = (match) => String(match.icecatId || `${match.source}:${match.title}`);
  const applySpecMatch = useCallback((match, query, preserveManual = false) => {
    setSelectedSpecKey(specKey(match));
    setSpecMetadata(match);
    if (replaceSpecsRef.current && !match.ai && !preserveManual) manualSpecKeys.current.clear();
    setForm((current) => ({
      ...current,
      brand: match.brand || current.brand,
      model: match.model || current.model,
      specs: mergeDetectedSpecs(current.specs || {}, match.specs || {}, query, [...manualSpecKeys.current], match.choices || {}),
      deviceDetails: {
        ...current.deviceDetails,
        specSource: match.source === 'Open Icecat' ? 'icecat' : match.source?.toLowerCase() || '',
        specSourceId: match.source === 'Open Icecat' ? String(match.icecatId || '') : '',
      },
    }));
  }, []);
  useEffect(() => {
    const query = (lookupQuery || form.title).trim();
    const lookupKey = `${form.category}:${query}:${lookupAttempt}:${language}:${lookupMode}`;
    if ((initial && !lookupAttempt) || query.length < 3 || lookupKey === lastLookup.current) return undefined;
    const timer = window.setTimeout(async () => {
      const requestId = lookupSequence.current + 1;
      lookupSequence.current = requestId;
      lastLookup.current = lookupKey;
      setSpecsBusy(true);
      setSpecNotice('');
      setSpecMatches([]);
      try {
        const data = lookupMode === 'ai'
          ? await api('/device-specs/ai', { method: 'POST', body: JSON.stringify({ query, category: form.category }) })
          : await api(`/device-specs?q=${encodeURIComponent(query)}&category=${encodeURIComponent(form.category)}&language=${encodeURIComponent(language)}`);
        if (requestId !== lookupSequence.current) return;
        const matches = data.results || [];
        if (!matches.length) {
          setSpecMatches([]);
          setSelectedSpecKey('');
          setSpecNotice(data.ai?.status === 'unrecognized' ? ac.unrecognized : data.ai && data.ai.status !== 'ready' ? ac.unavailable : c.noSpecs);
          return;
        }
        setSpecMatches(matches);
        const requestedStorage = query.match(/\b(32|64|128|256|512|1024)\s*(?:GB|ГБ|TB|ТБ)\b/i)?.[1];
        const { match, autoApply } = selectSpecLookupResult(matches, { ai: lookupMode === 'ai', requestedStorage });
        if (!autoApply) {
          setSelectedSpecKey('');
          setSpecNotice(lookupMode === 'ai' ? (data.ai?.status === 'ready' ? ac.choose : ac.unavailable) : c.chooseModel);
        } else {
          applySpecMatch(match, query, lookupMode === 'ai');
          setSpecNotice(lookupMode === 'ai' ? ac.applied : c.specsApplied);
        }
      } catch (error) {
        if (requestId !== lookupSequence.current) return;
        setSpecNotice(error.code === 'AI_SPEC_RATE_LIMIT' ? ac.limit : error.message);
      } finally {
        if (requestId === lookupSequence.current) setSpecsBusy(false);
      }
    }, 650);
    return () => {
      window.clearTimeout(timer);
      lookupSequence.current += 1;
    };
  }, [applySpecMatch, c.chooseModel, c.noSpecs, c.specsApplied, form.category, form.title, initial, language, lookupAttempt, lookupQuery, lookupMode, ac]);
  const submit = async (event) => {
    event.preventDefault();
    if (busy || photosBusy || photosGate.current) return;
    setSaveError('');
    setBusy(true);
    const payload = {
      ...form,
      price: Number(form.price),
      stock: Number(form.stock),
      images: form.images || [],
      region: initial?.region || region,
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
      setSaveError(error.code === 'INVENTORY_CODE_CONFLICT'
        ? (language === 'uk' ? 'Цей SKU і партія вже є у твоєму списку на цьому ринку. Зміни залишок наявної позиції або вкажи іншу партію.' : language === 'pl' ? 'Ten SKU i partia już istnieją na Twoim rynku. Zmień stan istniejącej pozycji lub podaj inną partię.' : 'This SKU and batch already exist in your market. Update the existing stock or use a different batch.')
        : error.message);
    } finally {
      setBusy(false);
    }
  };
  const formContent = (
      <form className={`listing-modal${page ? ' listing-page-form' : ''}`} onSubmit={submit}>
        <div className="modal-title">
          {!page && <div>
            <span className="eyebrow">NaShary Seller</span>
            <h2>{initial ? c.edit : c.add}</h2>
          </div>}
          <button type="button" onClick={onClose} aria-label={c.cancel}>
            {page ? `← ${c.cancel}` : '×'}
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
                setLookupQuery('');
                setLookupMode('sources');
                setSpecMetadata(null);
                change('title', event.target.value);
              }}
              placeholder={language === 'pl' ? 'np. Apple iPhone 15 Pro 256 GB' : language === 'uk' ? 'наприклад Apple iPhone 15 Pro 256 GB' : 'e.g. Apple iPhone 15 Pro 256 GB'}
            />
            <small role="status" className={`auto-spec-status${specsBusy ? ' is-loading' : ''}`}>{specsBusy ? (lookupMode === 'ai' ? ac.working : c.searchingSpecs) : specNotice}</small>
          </label>
          {specMetadata && <aside className="span-2 spec-coverage" aria-live="polite">
            <b>{sc.filled}: {(listingSpecs[form.category] || []).filter((key) => form.specs?.[key]).length} / {(listingSpecs[form.category] || []).length}</b>
            <p>{sc.hint}</p>
            {specMetadata.ai && <p>{ac.review} {specMetadata.ai.status !== 'ready' ? ac.noSource : ''}</p>}
            {specMetadata.ai?.fields?.length > 0 && <details><summary>{ac.evidence}</summary><dl>{specMetadata.ai.fields.map(key => <div key={key}><dt>{listingSpecLabels[key]?.[language] || key}</dt><dd>{specMetadata.specs[key]} — <q>{specMetadata.ai.evidence[key]?.quote}</q></dd></div>)}</dl></details>}
            {(listingSpecs[form.category] || []).some((key) => !form.specs?.[key]) && <p>{sc.missing}: {(listingSpecs[form.category] || []).filter((key) => !form.specs?.[key]).map((key) => listingSpecLabels[key]?.[language] || key).join(', ')}</p>}
            <div className="spec-sources"><span>{sc.source}:</span>{(specMetadata.sources || (specMetadata.sourceUrl ? [{ title: specMetadata.source, url: specMetadata.sourceUrl }] : [])).filter((source) => /^https?:\/\//.test(source.url || '')).map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a>)}</div>
          </aside>}
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
              value={form.brand}
              onChange={(event) => change('brand', event.target.value)}
            />
          </label>
          <div className="listing-model-field auto-resolved-field">
            <label>{c.model}<input required value={form.model} onChange={(event) => change('model', event.target.value)} /></label>
            <div className="spec-lookup-actions"><button className="primary-button" type="button" disabled={specsBusy || form.title.trim().length < 3} onClick={() => { setLookupMode('ai'); setLookupQuery(form.title.trim()); setLookupAttempt(n => n + 1); }}>{ac.button}</button>
            <button className="quiet-button" type="button" disabled={specsBusy} onClick={() => { setLookupMode('sources'); setLookupQuery([form.brand, form.model].filter(Boolean).join(' ') || form.title); setLookupAttempt((n) => n + 1); }}>{c.autoSpecs}</button></div>
          </div>
          <label className="check-filter span-2"><input type="checkbox" checked={replaceSpecs} onChange={(event) => { replaceSpecsRef.current = event.target.checked; setReplaceSpecs(event.target.checked); }} /><span>{sc.replace}</span></label>
          {specMatches.length > 0 && <div className="span-2 spec-lookup-results" aria-label={c.chooseModel}>{specMatches.slice(0, 4).map((match) => <button className={`spec-match-card${selectedSpecKey === specKey(match) ? ' is-selected' : ''}`} type="button" key={specKey(match)} onClick={() => { applySpecMatch(match, form.title, lookupMode === 'ai'); setSpecNotice(match.ai ? ac.applied : c.specsApplied); }}><span>{selectedSpecKey === specKey(match) ? '✓' : '＋'}</span><div><b>{match.title}</b><small>{match.ai ? 'AI · ' : ''}{match.source} · {Object.keys(match.specs || {}).length} {language === 'pl' ? 'parametrów' : language === 'uk' ? 'характеристик' : 'specifications'}{match.specs?.storage ? ` · ${match.specs.storage}` : ''}</small>{match.ai?.status !== undefined && match.ai.status !== 'ready' && <small>{ac.noSource}</small>}</div></button>)}</div>}
          <label>
            {c.category}
            <select
              required
              value={form.category}
              onChange={(event) => {
                setSpecMatches([]);
                setSelectedSpecKey('');
                setSpecNotice('');
                setSpecMetadata(null);
                lastLookup.current = '';
                manualSpecKeys.current.clear();
                setLookupMode('sources');
                setLookupQuery('');
                setForm((current) => ({ ...current, category: event.target.value, specs: {}, deviceDetails: { ...current.deviceDetails, specSource: '', specSourceId: '' } }));
              }}
            >
              {listingCategories.map((category) => (
                <option key={category} value={category}>{categoryLabel(category, language)}</option>
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
              <option value="new" disabled={!canSellNew}>{c.new}</option>
            </select>
            {!canSellNew && <small>{sellerCopy.hint}</small>}
          </label>
          <label>
            {c.location}
            <input
              required
              value={form.location}
              onChange={(event) => change('location', event.target.value)}
            />
          </label>
          <div className="span-2 listing-photo-field"><span className="listing-field-label">{c.photos}</span>
            <label className="photo-dropzone" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); addPhotoFiles(event.dataTransfer.files); }}>
              <input type="file" aria-label={c.photos} accept="image/png,image/jpeg,image/webp" multiple disabled={photosBusy} onChange={addPhotos}/><i>＋</i><b>{photosBusy ? pc.busy : language === 'pl' ? 'Dodaj zdjęcia urządzenia' : language === 'uk' ? 'Додайте фотографії пристрою' : 'Add device photos'}</b><small>{pc.hint}</small>
            </label>
            <p className="photo-status" role="status">{photoNotice}</p>
            {form.images.length > 0 && <div className="listing-photo-grid">{form.images.map((image, index) => <figure key={`${image.slice(0, 30)}-${index}`}><img src={imageUrl(image)} alt={`${language === 'uk' ? 'Фото' : language === 'en' ? 'Photo' : 'Zdjęcie'} ${index + 1}`}/>
              <button type="button" disabled={photosBusy} aria-label={`${pc.remove} ${index + 1}`} onClick={() => change('images', form.images.filter((_, itemIndex) => itemIndex !== index))}>×</button>
              {index === 0 ? <span>{pc.cover}</span> : <button type="button" className="make-cover" disabled={photosBusy} onClick={() => change('images', [image, ...form.images.filter((_, itemIndex) => itemIndex !== index)])}>{pc.makeCover}</button>}
            </figure>)}</div>}
          </div>
          {form.condition === 'new' && <SupplyFields value={form.supplyDetails} onChange={(value) => change('supplyDetails', value)} language={language} />}
          <label>{c.warranty}<select value={form.warranty} onChange={(event) => change('warranty', event.target.value)}><option value="none">{supply.warrantyNone}</option><option value="seller">{supply.warrantySeller}</option><option value="manufacturer">{supply.warrantyManufacturer}</option></select></label>
          <label>{c.status}<select value={form.status} onChange={(event) => change('status', event.target.value)}>{['active','reserved','sold','draft'].map((value) => <option key={value} value={value}>{c[value]}</option>)}</select></label>
          <label className="check-filter"><input type="checkbox" checked={form.negotiable} onChange={(event) => change('negotiable', event.target.checked)} /><span>{c.negotiable}</span></label>
          <label className="check-filter"><input type="checkbox" checked={form.urgent} onChange={(event) => change('urgent', event.target.checked)} /><span>{c.urgent}</span></label>
          {form.condition === 'used' && <UsedConditionFields value={form.deviceDetails} inspection={form.inspection} onChange={(value) => change('deviceDetails', value)} onInspectionChange={(value) => change('inspection', value)} language={language}/>}

          {(listingSpecs[form.category] || []).length > 0 && <details className="span-2 auto-spec-review" open={Boolean(selectedSpecKey) || !specMatches.length}>
            <summary><span>{language === 'pl' ? 'Dane techniczne' : language === 'uk' ? 'Технічні характеристики' : 'Technical specifications'}</span><small>{(listingSpecs[form.category] || []).filter((key) => form.specs?.[key]).length} / {(listingSpecs[form.category] || []).length}</small></summary>
            <div className="form-grid-react">{(listingSpecs[form.category] || []).map((key) => (
              <label key={key}>
                {listingSpecLabels[key][language] || listingSpecLabels[key].pl}
                <input maxLength={80} list={specMetadata?.choices?.[key]?.length ? specInputPrefix + key : undefined} placeholder={specMetadata ? (specMetadata.choices?.[key]?.length ? sc.choose : sc.manual) : ''} value={form.specs?.[key] || ''} onChange={(event) => changeSpec(key, event.target.value)} />
                {specMetadata?.choices?.[key]?.length > 0 && <>
                  <datalist id={specInputPrefix + key}>{specMetadata.choices[key].map((option) => <option value={option} key={option} />)}</datalist>
                  <div className="spec-choice-buttons" aria-label={sc.choices}>{specMetadata.choices[key].map((option) => <button type="button" key={option} className={form.specs?.[key] === option ? 'is-active' : ''} onClick={() => changeSpec(key, option)}>{option}</button>)}</div>
                </>}
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
        {saveError && <p className="form-error" role="alert">{saveError}</p>}
        <div className="modal-actions">
          <button className="quiet-button" type="button" onClick={onClose}>
            {c.cancel}
          </button>
          <button className="primary-button" disabled={busy || photosBusy} type="submit">
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
  const details = accountCopy[language] || accountCopy.pl;
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'overview';
  const [listings, setListings] = useState([]);
  const [orders, setOrders] = useState([]);
  const [receiptBusy,setReceiptBusy]=useState('');
  const [conversations, setConversations] = useState([]);
  const [editing, setEditing] = useState(undefined);
  const activeEditing = editing !== undefined ? editing : listings.find((item) => item.id === params.get('edit'));
  const [staffRevision, setStaffRevision] = useState(0);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const avatarInput = useRef(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const avatarGate = useRef(false);
  const uploadAvatar = async (event) => {
    const input = event.target;
    const file = input.files?.[0];
    if (!file || avatarGate.current) return;
    avatarGate.current = true; setAvatarBusy(true);
    try {
      const avatar = await preparePhoto(file, { maxSide: 384, maxLength: 180_000 });
      const result = await api('/auth/me', { method: 'PATCH', body: JSON.stringify({ avatar }) });
      updateProfile(result.user); flash(c.avatarSaved);
    } catch (error) { flash((photoCopy[language] || photoCopy.pl)[error.message] || error.message); }
    finally { avatarGate.current = false; setAvatarBusy(false); input.value = ''; }
  };
  const refresh = useCallback(() => {
    if (!user) return;
    Promise.all([api('/products/mine'), api('/orders?scope=mine'), api('/chats')]).then(
      ([mine, orderList, chatList]) => {
        setListings(mine);
        setOrders(orderList);
        setConversations(chatList);
        setLoadError('');
        setLoading(false);
      }
    ).catch((error) => { setLoadError(error.message); setLoading(false); });
  }, [user]);
  useEffect(() => {
    refresh();
  }, [refresh]);
  const confirmReceipt=async(orderId,sellerId)=>{
    if(receiptBusy) return;
    setReceiptBusy(`${orderId}:${sellerId}`);
    try{await api(`/orders/${orderId}/receipt/${sellerId}`,{method:'PATCH'});refresh();}
    catch(error){flash(error.message);}
    finally{setReceiptBusy('');}
  };
  if (!user) return <Navigate to="/auth" state={{ from: '/account' }} replace />;
  const remove = async (id) => {
    if (!window.confirm(c.deleteConfirm)) return;
    await api(`/products/${id}`, { method: 'DELETE' });
    setListings((items) => items.filter((item) => item.id !== id));
  };
  const nav = [
    ['overview', c.overview],
    ['listings', c.listings],
    ['orders', salesCopy[language].purchases],
    ['sales', salesCopy[language].title],
    ['messages', c.messages],
    ['saved', c.saved],
    ['profile', details.profile],
    ['security', details.security],
    ['access', accessLabel(language)],
    ...(['admin', 'moderator'].includes(user.role) ? [['moderation', c.moderation]] : []),
  ];
  return (
    <div className="account-page account-workspace shell">
      <header className="account-hero">
        <div className="account-identity">
          <button
            className="profile-avatar"
            type="button"
            onClick={() => avatarInput.current?.click()}
            title={avatarBusy ? (photoCopy[language] || photoCopy.pl).busy : c.avatar}
            disabled={avatarBusy}
            aria-busy={avatarBusy}
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
              {c.hello}, {user.displayName || user.username}
            </h1>
            <p>{c.accountText}</p>
            <span className="role-badge">{details.role[user.role] || details.role.user} · @{user.username}</span>
          </div>
        </div>
        <button className="quiet-button" type="button" onClick={async () => { try { await api('/auth/logout', { method: 'POST' }); } catch (error) { flash(error.message); } finally { signOut(); } }}>
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
      {loadError && <div className="account-load-error" role="alert">{loadError} <button type="button" onClick={refresh}>{details.retry}</button></div>}
      {loading && <p className="account-loading" role="status">{details.loading}</p>}
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
            <button className="text-button" type="button" onClick={()=>setParams({tab:'sales'})}>{salesCopy[language].salesLink}</button>
          </article>
          <article>
            <span className="metric">{orders.length}</span>
            <h2>{salesCopy[language].purchases}</h2>
            <p>{c.orderInfo}</p>
            <button
              className="text-button"
              type="button"
              onClick={() => setParams({ tab: 'orders' })}
            >
              {salesCopy[language].purchases} →
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
      {tab === 'listings' && <SellerInventory listings={listings} user={user} language={language} c={c} formatPrice={formatPrice} onEdit={setEditing} onRemove={remove} loading={loading} />}
      {tab === 'sales' && <SellerSales />}
      {tab === 'orders' && (
        <section className="account-section">
          <div className="section-title">
            <div>
              <span className="eyebrow">History</span>
              <h2>{salesCopy[language].purchases}</h2>
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
                    <b>{salesCopy[language].status[order.status] || order.status}</b>
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
                    {order.shipping > 0 && <div><dt>{language === 'uk' ? 'Доставка' : language === 'en' ? 'Delivery' : 'Dostawa'}</dt><dd>{order.shippingDiscount > 0 ? <><s>{formatPrice(order.shipping, order.currency)}</s> {formatPrice(Math.max(0, order.shipping - order.shippingDiscount), order.currency)}</> : formatPrice(order.shipping, order.currency)}</dd></div>}
                    {order.rewardGift && <div className="is-gift"><dt>{language === 'uk' ? 'Подарунок' : language === 'en' ? 'Gift' : 'Prezent'}</dt><dd>{orderGiftLabels[language]?.[order.rewardGift] || order.rewardGift}</dd></div>}
                  </dl>}
                  {order.promoCode && <p className="sales-note">{language === 'uk' ? 'Промокод' : language === 'en' ? 'Promo code' : 'Kod rabatowy'}: <b>{order.promoCode}</b>{order.promoReleasedAt && <span> · {language === 'uk' ? 'Використання скасовано разом з усім замовленням. Код можна застосувати знову за початковими умовами, якщо строк дії не минув. Це не повернення коштів.' : language === 'en' ? 'Redemption released after full cancellation. The code can be used again under its original terms if it has not expired. This is not a payment refund.' : 'Użycie cofnięto po anulowaniu całego zamówienia. Kod można wykorzystać ponownie na pierwotnych warunkach, jeśli nie wygasł. To nie jest zwrot płatności.'}</span>}</p>}
                  {order.fulfillments?.map(fulfillment=><div className="buyer-fulfillment" key={fulfillment.sellerId}><span>{order.items.find(item=>item.sellerId===fulfillment.sellerId)?.seller || 'NaShary'} · {salesCopy[language].status[fulfillment.status]}</span>{fulfillment.status==='delivered' && <button className="quiet-button" type="button" disabled={!!receiptBusy} onClick={()=>confirmReceipt(order.id,fulfillment.sellerId)}>{salesCopy[language].receipt}</button>}</div>)}
                  <footer>
                    <small>{new Date(order.createdAt).toLocaleDateString()}</small>
                    <div><small>{language==='uk'?'Сума під час оформлення':language==='pl'?'Kwota przy zamówieniu':'Total at checkout'}</small><strong>{formatPrice(order.total, order.currency)}</strong></div>
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
      {tab === 'profile' && <AccountSettings key="profile" />}
      {tab === 'security' && <AccountSettings key="security" security />}
      {(tab === 'access' || (tab === 'moderation' && !['admin', 'moderator'].includes(user.role))) && <AccountAccess />}
      {tab === 'moderation' && ['admin', 'moderator'].includes(user.role) && <StaffPanel key={staffRevision} onEdit={setEditing} />}
      {activeEditing !== undefined && (
        <ListingForm
          initial={activeEditing}
          region={activeEditing?.region || region}
          language={language}
          c={c}
          onClose={() => { setEditing(undefined); if (params.has('edit')) { const next = new URLSearchParams(params); next.delete('edit'); setParams(next, { replace: true }); } }}
          onSaved={(saved) => {
            setStaffRevision((n) => n + 1);
            setListings((items) =>
              activeEditing
                ? items.map((item) => (item.id === saved.id ? saved : item))
                : [saved, ...items]
            );
          }}
        />
      )}
    </div>
  );
}
