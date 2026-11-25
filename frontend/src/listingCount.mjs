const forms = {
  uk: { one: 'пропозиція', few: 'пропозиції', many: 'пропозицій', other: 'пропозиції' },
  pl: { one: 'oferta', few: 'oferty', many: 'ofert', other: 'oferty' },
  en: { one: 'offer', other: 'offers' },
};
const rules = Object.fromEntries(Object.keys(forms).map((language) => [language, new Intl.PluralRules(language)]));
export function listingCount(value, language = 'pl') {
  const count = Number.isFinite(Number(value)) ? Math.max(0, Math.trunc(Number(value))) : 0;
  const locale = forms[language] ? language : 'pl';
  return `${new Intl.NumberFormat(locale).format(count)} ${forms[locale][rules[locale].select(count)] || forms[locale].other}`;
}
