export const conditionCopy = {
  uk: {
    title: 'Стан цього пристрою', source: 'За даними продавця', hint: 'NaShary не проводить діагностику цього пристрою. Уточніть стан і перевірте його перед покупкою.',
    formHint: 'Опишіть саме цей пристрій. Додайте власні фото екрана, корпусу, комплекту й дефектів. Характеристики моделі не підтверджують стан товару.',
    battery: 'Стан батареї', reported: 'Є показник від пристрою', unknown: 'Немає даних', unavailable: 'Пристрій не показує відсоток', not_applicable: 'Не застосовується',
    percent: 'Показник батареї, %', batteryHint: 'Лише якщо пристрій або його звіт показує цей відсоток (наприклад, підтримуваний iPhone чи звіт ноутбука). Не вгадуйте. Показник не дорівнює заряду.',
    batteryRuntime: 'Автономність за спостереженнями', runtimeHint: 'Наприклад: близько 4 годин відео, Wi-Fi, яскравість 50%. Це оцінка продавця.',
    display: 'Екран', body: 'Корпус', completeness: 'Що в комплекті', defects: 'Дефекти', defectsStatus: 'Відомі дефекти',
    none: 'Продавець не помітив дефектів', defectsReported: 'Є відомі дефекти', defectsHint: 'Опишіть несправності та пошкодження. «Немає даних» не означає, що дефектів немає.',
    repairs: 'Ремонти й замінені деталі', grade: 'Клас за оцінкою продавця', gradeHint: 'Необов’язково. Клас — суб’єктивна оцінка продавця, не сертифікат NaShary.', serialChecked: 'Я перевірив серійний номер',
    inspection: 'Що перевірив продавець', inspectionHint: 'Позначено продавцем. Непозначений пункт означає відсутність даних, а не несправність.', checked: 'Заявлено перевірку', notChecked: 'Немає даних',
    screen: 'Екран', cameras: 'Камери', buttons: 'Кнопки', connectivity: 'Підключення', serialNumber: 'Серійний номер', profile: 'Профіль підтверджено', profileHint: 'Позначка профілю продавця не підтверджує стан товару.',
  },
  pl: {
    title: 'Stan tego urządzenia', source: 'Według sprzedawcy', hint: 'NaShary nie przeprowadza diagnostyki tego urządzenia. Potwierdź stan przed zakupem.',
    formHint: 'Opisz ten egzemplarz. Dodaj własne zdjęcia ekranu, obudowy, zestawu i wad. Parametry modelu nie potwierdzają stanu urządzenia.',
    battery: 'Kondycja baterii', reported: 'Urządzenie podaje wynik', unknown: 'Brak danych', unavailable: 'Urządzenie nie podaje procentu', not_applicable: 'Nie dotyczy',
    percent: 'Kondycja baterii, %', batteryHint: 'Tylko wynik widoczny w urządzeniu lub jego raporcie (np. obsługiwany iPhone lub raport laptopa). Nie zgaduj. To nie poziom naładowania.',
    batteryRuntime: 'Zaobserwowany czas pracy', runtimeHint: 'Np. około 4 godzin filmu, Wi-Fi, jasność 50%. To szacunek sprzedawcy.',
    display: 'Ekran', body: 'Obudowa', completeness: 'Zawartość zestawu', defects: 'Wady', defectsStatus: 'Znane wady', none: 'Sprzedawca nie zauważył wad', defectsReported: 'Znane wady', defectsHint: 'Opisz usterki i uszkodzenia. Brak danych nie oznacza braku wad.',
    repairs: 'Naprawy i wymienione części', grade: 'Klasa według sprzedawcy', gradeHint: 'Opcjonalnie. Subiektywna ocena sprzedawcy, nie certyfikat NaShary.', serialChecked: 'Sprawdziłem numer seryjny',
    inspection: 'Co sprawdził sprzedawca', inspectionHint: 'Deklaracja sprzedawcy. Brak oznaczenia oznacza brak danych, nie usterkę.', checked: 'Zadeklarowano kontrolę', notChecked: 'Brak danych',
    screen: 'Ekran', cameras: 'Aparaty', buttons: 'Przyciski', connectivity: 'Łączność', serialNumber: 'Numer seryjny', profile: 'Profil potwierdzony', profileHint: 'Oznaczenie profilu nie potwierdza stanu towaru.',
  },
  en: {
    title: 'Condition of this device', source: 'Reported by the seller', hint: 'NaShary has not diagnosed this device. Confirm its condition before buying.',
    formHint: 'Describe this particular device. Add your own photos of the display, body, included items and defects. Model specifications do not verify device condition.',
    battery: 'Battery health', reported: 'Device reports a value', unknown: 'No data', unavailable: 'Device does not report a percentage', not_applicable: 'Not applicable',
    percent: 'Reported battery health, %', batteryHint: 'Only a value shown by the device or its report (e.g. a supported iPhone or laptop report). Do not guess. This is not the charge level.',
    batteryRuntime: 'Observed battery runtime', runtimeHint: 'E.g. about 4 hours of video, Wi-Fi, 50% brightness. This is the seller’s estimate.',
    display: 'Display', body: 'Body', completeness: 'Included items', defects: 'Defects', defectsStatus: 'Known defects', none: 'Seller has not noticed defects', defectsReported: 'Known defects reported', defectsHint: 'Describe faults and damage. No data does not mean no defects.',
    repairs: 'Repairs and replacement parts', grade: 'Seller condition grade', gradeHint: 'Optional. A subjective seller assessment, not a NaShary certificate.', serialChecked: 'I checked the serial number',
    inspection: 'Seller inspection checklist', inspectionHint: 'Declared by the seller. An unmarked item means no data, not a fault.', checked: 'Check declared', notChecked: 'No data',
    screen: 'Display', cameras: 'Cameras', buttons: 'Buttons', connectivity: 'Connectivity', serialNumber: 'Serial number', profile: 'Profile confirmed', profileHint: 'The seller profile badge does not verify the condition of the item.',
  },
};

export const inspectionKeys = ['screen', 'battery', 'cameras', 'buttons', 'connectivity', 'serialNumber'];
export function batteryState(value = {}) {
  if (['unknown', 'reported', 'unavailable', 'not_applicable'].includes(value.batteryHealthStatus)) return value.batteryHealthStatus;
  return typeof value.batteryHealth === 'number' && Number.isInteger(value.batteryHealth) && value.batteryHealth >= 0 && value.batteryHealth <= 100 ? 'reported' : 'unknown';
}
export function defectsState(value = {}) {
  return ['unknown', 'none', 'reported'].includes(value.defectsStatus) ? value.defectsStatus : value.defects?.trim() ? 'reported' : 'unknown';
}
