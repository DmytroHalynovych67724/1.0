export const sectionCopy = {
  uk: { new: 'Нова техніка', used: 'Б/в маркетплейс', newLead: 'Нові пристрої. Порівнюй моделі, конфігурації та пропозиції.', usedLead: 'Техніка від власників. Перевіряй стан, комплектацію та домовляйся про ціну.', newEmpty: 'Нові товари незабаром з’являться. Переглянь б/в маркетплейс або додай свій товар.', usedEmpty: 'У цьому розділі ще немає оголошень. Додай перше або переглянь нову техніку.', preview: 'Резервний перегляд каталогу. Наявність і ціни перевіряться після з’єднання із сервером.', error: 'Не вдалося завантажити каталог. Спробуй ще раз.', retry: 'Повторити', sell: 'Додати оголошення', all: 'Переглянути розділ', batches: 'Для кожної пропозиції', batchLead: 'Перевіряй версію пристрою, комплектацію та гарантію в описі товару.' },
  pl: { new: 'Nowy sprzęt', used: 'Marketplace używanych', newLead: 'Nowe urządzenia. Porównuj modele, konfiguracje i oferty.', usedLead: 'Sprzęt od właścicieli. Sprawdzaj stan, wyposażenie i negocjuj cenę.', newEmpty: 'Nowe produkty pojawią się wkrótce. Zobacz używany sprzęt lub dodaj produkt.', usedEmpty: 'Nie ma jeszcze ogłoszeń w tej sekcji. Dodaj pierwsze lub zobacz nowy sprzęt.', preview: 'Podgląd katalogu z kopii. Dostępność i ceny zostaną sprawdzone po połączeniu z serwerem.', error: 'Nie udało się wczytać katalogu. Spróbuj ponownie.', retry: 'Ponów', sell: 'Dodaj ogłoszenie', all: 'Zobacz sekcję', batches: 'Przy każdej ofercie', batchLead: 'Sprawdź wersję urządzenia, wyposażenie i gwarancję w opisie produktu.' },
  en: { new: 'New devices', used: 'Pre-owned marketplace', newLead: 'New devices. Compare models, configurations and offers.', usedLead: 'Devices from their owners. Check condition, accessories and negotiate.', newEmpty: 'New products are coming soon. Explore pre-owned devices or add a product.', usedEmpty: 'No listings here yet. Add the first one or explore new devices.', preview: 'Backup catalog preview. Stock and prices will be checked when the server reconnects.', error: 'Could not load the catalog. Please try again.', retry: 'Retry', sell: 'Create listing', all: 'Explore section', batches: 'For every offer', batchLead: 'Check device market version, included accessories and warranty in the product description.' },
};

export function sectionPath(section) {
  return section === 'used' ? '/marketplace' : '/catalog';
}

export function sectionQuery(signature, section, region) {
  const params = new URLSearchParams(signature);
  params.set('region', region);
  if (section) params.set('condition', section === 'used' ? 'used' : 'new');
  return params;
}

export function legacySectionRedirect(signature) {
  const params = new URLSearchParams(signature);
  if (params.get('condition') !== 'used') return null;
  params.delete('condition');
  const query = params.toString();
  return `/marketplace${query ? `?${query}` : ''}`;
}
