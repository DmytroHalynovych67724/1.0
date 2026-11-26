export function availabilityFor(product) {
  if (product?.status === 'sold') return 'unavailable';
  const declared = product?.supplyDetails?.availability;
  if (['on_order', 'expected', 'unavailable'].includes(declared)) return declared;
  return Number(product?.stock) > 0 ? 'in_stock' : 'unavailable';
}

export function supplyOrigin(details = {}) {
  if (['local', 'china', 'other'].includes(details.origin)) return details.origin;
  return details.origin === '' ? '' : details.marketVersion === 'CN' ? 'china' : '';
}

export const supplyCopy = {
  uk: {
    offerTitle: 'Продаж товару', origin: 'Походження товару', local: 'Придбано на місцевому ринку', china: 'Постачання з Китаю', otherOrigin: 'Інше походження', optionalDetails: 'Артикул, партія, комплект і гарантія (необов’язково)',
    inventoryHint: 'SKU позначає конкретну конфігурацію. Для іншого надходження цього SKU вкажи окрему партію. На одному ринку одна партія й SKU мають одну поточну позицію продавця; кількість змінюй у залишку. Регістр літер A–Z у кодах не враховується.',
    other: 'Інша', warrantyNone: 'Не вказано', warrantySeller: 'Від продавця', warrantyManufacturer: 'Від виробника',
    title: 'Версія та постачання', hint: 'Вкажіть дані саме цієї комплектації. Автозаповнення моделі їх не змінює.', unknown: 'Не вказано',
    availability: 'Доступність', in_stock: 'У наявності', on_order: 'Під замовлення', expected: 'Очікується', unavailable: 'Немає в наявності',
    marketVersion: 'Версія ринку', firmware: 'Прошивка', languages: 'Підтримувані мови', networkBands: 'Мережі та частоти', packageContents: 'Комплектація', warrantyTerms: 'Умови гарантії', leadTime: 'Термін постачання', sku: 'Артикул (SKU)', batch: 'Код партії',
    termsUnknown: 'Термін уточнюйте у продавця.', inquiry: 'Уточнити постачання', checkoutHint: 'Купівля через кошик доступна після появи товару в наявності.', changed: 'Деякі товари вже недоступні для покупки. Перевірте їхню наявність.',
  },
  pl: {
    offerTitle: 'Sprzedaż produktu', origin: 'Pochodzenie produktu', local: 'Zakup na lokalnym rynku', china: 'Dostawa z Chin', otherOrigin: 'Inne pochodzenie', optionalDetails: 'SKU, partia, zestaw i gwarancja (opcjonalnie)',
    inventoryHint: 'SKU oznacza konkretną konfigurację. Dla kolejnej dostawy użyj innej partii. Jeden sprzedawca ma jedną bieżącą pozycję SKU i partii na danym rynku; ilość zmieniaj w stanie magazynowym. Wielkość liter A–Z w kodach nie ma znaczenia.',
    other: 'Inna', warrantyNone: 'Nie podano', warrantySeller: 'Sprzedawcy', warrantyManufacturer: 'Producenta',
    title: 'Wersja i dostawa', hint: 'Podaj dane tej konfiguracji. Automatyczne parametry modelu ich nie zmieniają.', unknown: 'Nie podano',
    availability: 'Dostępność', in_stock: 'W magazynie', on_order: 'Na zamówienie', expected: 'Oczekiwana dostawa', unavailable: 'Niedostępny',
    marketVersion: 'Wersja rynkowa', firmware: 'Oprogramowanie', languages: 'Obsługiwane języki', networkBands: 'Sieci i pasma', packageContents: 'Zawartość zestawu', warrantyTerms: 'Warunki gwarancji', leadTime: 'Termin dostawy', sku: 'Kod produktu (SKU)', batch: 'Kod partii',
    termsUnknown: 'Zapytaj sprzedawcę o termin.', inquiry: 'Zapytaj o dostawę', checkoutHint: 'Zakup w koszyku będzie dostępny po pojawieniu się produktu w magazynie.', changed: 'Niektóre produkty nie są już dostępne do zakupu. Sprawdź dostępność.',
  },
  en: {
    offerTitle: 'Product sale', origin: 'Product origin', local: 'Purchased locally', china: 'Supply from China', otherOrigin: 'Other origin', optionalDetails: 'SKU, batch, accessories and warranty (optional)',
    inventoryHint: 'SKU identifies a specific configuration. Use a different batch for a separate delivery. Each seller has one current listing per market, SKU and batch; update its stock quantity. Letter case A–Z is ignored in codes.',
    other: 'Other', warrantyNone: 'Not specified', warrantySeller: 'Seller warranty', warrantyManufacturer: 'Manufacturer warranty',
    title: 'Version and supply', hint: 'Enter details for this configuration. Model autofill does not change these fields.', unknown: 'Not specified',
    availability: 'Availability', in_stock: 'In stock', on_order: 'On order', expected: 'Expected', unavailable: 'Out of stock',
    marketVersion: 'Market version', firmware: 'Firmware', languages: 'Supported languages', networkBands: 'Networks and bands', packageContents: 'Included accessories', warrantyTerms: 'Warranty terms', leadTime: 'Supply lead time', sku: 'Product code (SKU)', batch: 'Batch code',
    termsUnknown: 'Ask the seller about timing.', inquiry: 'Ask about supply', checkoutHint: 'Cart checkout becomes available when the product is in stock.', changed: 'Some products are no longer available for checkout. Check availability.',
  },
};

export const newSellerCopy = {
  uk: { approve: 'Дозволити продаж нової техніки', revoke: 'Відкликати дозвіл на нову техніку', allowed: 'Продаж нової техніки дозволено', denied: 'Нова техніка — після схвалення адміністратора', hint: 'Б/в оголошення доступні всім. Для продажу нової техніки потрібне схвалення адміністратора. Після зміни дозволу увійдіть повторно.' },
  pl: { approve: 'Zezwól na sprzedaż nowego sprzętu', revoke: 'Cofnij zgodę na nowy sprzęt', allowed: 'Sprzedaż nowego sprzętu dozwolona', denied: 'Nowy sprzęt wymaga zgody administratora', hint: 'Każdy może wystawiać używany sprzęt. Nowy sprzęt wymaga zgody administratora. Po zmianie uprawnień zaloguj się ponownie.' },
  en: { approve: 'Approve new-device sales', revoke: 'Revoke new-device sales', allowed: 'New-device sales approved', denied: 'New-device sales require administrator approval', hint: 'Anyone can list pre-owned devices. Selling new devices requires administrator approval. Sign in again after permission changes.' },
};
