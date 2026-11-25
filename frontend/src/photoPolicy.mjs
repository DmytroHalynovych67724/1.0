export const MAX_PHOTO_INPUT = 15 * 1024 * 1024;
export function photoInputError(file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file?.type)) return 'format';
  if (!Number.isFinite(file.size) || file.size <= 0 || file.size > MAX_PHOTO_INPUT) return 'size';
  return '';
}
export function fitPhoto(width, height, maxSide = 2048) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1 || width * height > 50_000_000 || width > 20000 || height > 20000) throw new Error('dimensions');
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export const photoCopy = {
  uk: { hint: 'JPG, PNG або WebP до 15 МБ. Фото автоматично оптимізуються перед збереженням. До 8 фото; додайте крупні плани стану й дефектів.', busy: 'Оптимізую фотографії…', added: 'Додано фото', skipped: 'Пропущено', format: 'Підтримуються JPG, PNG і WebP. HEIC потрібно перетворити на JPG.', size: 'Файл порожній або більший за 15 МБ.', dimensions: 'Надто велика роздільна здатність фото.', decode: 'Не вдалося прочитати або оптимізувати фото. Спробуйте інший файл.', limit: 'В оголошенні може бути до 8 фотографій.', cover: 'Головне фото', makeCover: 'Зробити головним', remove: 'Видалити фото' },
  pl: { hint: 'JPG, PNG lub WebP do 15 MB. Zdjęcia optymalizujemy przed zapisem. Do 8 zdjęć; dodaj zbliżenia stanu i wad.', busy: 'Optymalizuję zdjęcia…', added: 'Dodano zdjęcia', skipped: 'Pominięto', format: 'Obsługiwane są JPG, PNG i WebP. HEIC przekonwertuj na JPG.', size: 'Plik jest pusty lub przekracza 15 MB.', dimensions: 'Zbyt duża rozdzielczość zdjęcia.', decode: 'Nie udało się odczytać lub zoptymalizować zdjęcia. Wybierz inny plik.', limit: 'Ogłoszenie może mieć do 8 zdjęć.', cover: 'Zdjęcie główne', makeCover: 'Ustaw jako główne', remove: 'Usuń zdjęcie' },
  en: { hint: 'JPG, PNG or WebP up to 15 MB. Photos are optimized before saving. Up to 8 photos; add close-ups of condition and defects.', busy: 'Optimizing photos…', added: 'Photos added', skipped: 'Skipped', format: 'Use JPG, PNG or WebP. Convert HEIC to JPG first.', size: 'The file is empty or exceeds 15 MB.', dimensions: 'Photo resolution is too large.', decode: 'Could not read or optimize this photo. Try another file.', limit: 'A listing can contain up to 8 photos.', cover: 'Cover photo', makeCover: 'Make cover', remove: 'Remove photo' },
};
