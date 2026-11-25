import policy from '../../../shared/rewardPolicy.json';
import { useStore } from '../store';

export default function RewardRules() {
  const { language, region, regions, formatPrice } = useStore();
  const copy = {
    uk: ['Як працюють знижки', 'Хрестики-нулики та квіз 7/8 — 5%; квіз 8/8 — 10%. Реакція — знижка на доставку.', 'Код діє 7 днів, один раз і лише для акаунта, що його отримав, у вибраному регіоні.', 'Знижка лише на нову техніку від продавців із типом «магазин». Відсотковий код не зменшує вартість доставки. Код на доставку — лише для замовлення з новою технікою магазину, без самовивозу. Одне замовлення — один код.', 'Гранична знижка', 'Не більше однієї винагороди з кожної гри на день. Невлучні спроби та нічиї можна повторювати; квіз має одну спробу на день.'],
    pl: ['Jak działają rabaty', 'Kółko i krzyżyk oraz quiz 7/8: 5%; quiz 8/8: 10%. Refleks: rabat na dostawę.', 'Kod jest ważny 7 dni, jednorazowy i przypisany do konta oraz wybranego regionu.', 'Rabat tylko na nowe urządzenia od sprzedawców typu sklep. Kod procentowy nie obniża dostawy. Kod dostawy obejmuje tylko zamówienia z nowym sprzętem sklepu, bez odbioru osobistego. Jeden kod na zamówienie.', 'Maksymalny rabat', 'Najwyżej jedna nagroda z każdej gry dziennie. Chybienia i remisy można powtarzać; quiz ma jedną próbę dziennie.'],
    en: ['How discounts work', 'Tic-tac-toe and quiz 7/8: 5%; perfect quiz 8/8: 10%. Reflex: a shipping discount.', 'Codes last 7 days, work once and belong to the earning account in the selected region.', 'Discounts apply only to new devices from store sellers, excluding used devices. Percentage codes exclude shipping. Shipping codes require an order containing only new store devices and cannot be used for collection. One code per order.', 'Maximum discount', 'At most one reward per game per day. Misses and draws can be retried; the quiz has one attempt per day.'],
  };
  const c = copy[language] || copy.pl;
  const caps = policy.capsCents[region];
  const shippingLabel = { uk: 'Доставка: до', pl: 'Dostawa: do', en: 'Shipping: up to' }[language];
  return <details className="game-reward-rules"><summary>{c[0]}</summary><p>{c[1]} {c[4]}: 5% → {formatPrice(caps['5'] / 100, regions[region].currency)}; 10% → {formatPrice(caps['10'] / 100, regions[region].currency)}. {shippingLabel} {formatPrice(policy.shippingCapsCents[region] / 100, regions[region].currency)}.</p><ul><li>{c[2]}</li><li>{c[3]}</li><li>{c[5]}</li></ul></details>;
}
