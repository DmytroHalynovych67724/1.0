export const catalogCategories = [
  ['Smartfony', 'phone', { uk: 'Смартфони', pl: 'Smartfony', en: 'Smartphones' }],
  ['Laptopy', 'laptop', { uk: 'Ноутбуки', pl: 'Laptopy', en: 'Laptops' }],
  ['Tablety', 'phone', { uk: 'Планшети', pl: 'Tablety', en: 'Tablets' }],
  ['Gaming', 'console', { uk: 'Геймінг', pl: 'Gaming', en: 'Gaming' }],
  ['Audio', 'headphones', { uk: 'Аудіотехніка', pl: 'Audio', en: 'Audio' }],
  ['Monitory', 'monitor', { uk: 'Монітори', pl: 'Monitory', en: 'Monitors' }],
  ['Foto', 'camera', { uk: 'Фото та відео', pl: 'Foto i wideo', en: 'Photo & video' }],
  ['Akcesoria', 'watch', { uk: 'Аксесуари', pl: 'Akcesoria', en: 'Accessories' }],
];
export function categoryLabel(category, language) {
  const labels = catalogCategories.find(([key]) => key === category)?.[2];
  return labels?.[language] || labels?.pl || category;
}
