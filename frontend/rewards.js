(() => {
  'use strict';
  const TM = window.NaShary;
  if (!TM) return;
  const language = window.NaSharyI18n?.language || 'pl';
  const copy = {
    pl: { eyebrow: 'Codzienne bonusy', title: 'Zagraj o kod promocyjny', spinTitle: 'Koło rabatów', spinDescription: 'Zakręć kołem. Wynik i kod ustala bezpiecznie serwer.', spin: 'Zakręć', quizTitle: 'Tech quiz', question: 'Który podzespół przechowuje pliki po wyłączeniu komputera?', login: 'Zaloguj się, aby zagrać.', won: (percent, code) => `Wygrywasz ${percent}%! Kod: ${code}`, lost: 'Nie tym razem. Wróć jutro!', used: 'Dzisiejsza próba została już wykorzystana.' },
    uk: { eyebrow: 'Щоденні бонуси', title: 'Зіграйте за промокод', spinTitle: 'Колесо знижок', spinDescription: 'Крутіть колесо. Результат і код безпечно визначає сервер.', spin: 'Крутити', quizTitle: 'Tech-вікторина', question: 'Який компонент зберігає файли після вимкнення комп’ютера?', login: 'Увійдіть, щоб зіграти.', won: (percent, code) => `Ви виграли ${percent}%! Код: ${code}`, lost: 'Не цього разу. Повертайтеся завтра!', used: 'Сьогоднішню спробу вже використано.' },
    en: { eyebrow: 'Daily bonuses', title: 'Play for a promo code', spinTitle: 'Discount wheel', spinDescription: 'Spin the wheel. The server securely determines the result and code.', spin: 'Spin', quizTitle: 'Tech quiz', question: 'Which component keeps files after the computer is turned off?', login: 'Sign in to play.', won: (percent, code) => `You won ${percent}%! Code: ${code}`, lost: 'Not this time. Come back tomorrow!', used: 'Today’s attempt has already been used.' },
  }[language];

  function localize() {
    document.getElementById('rewardsEyebrow').textContent = copy.eyebrow;
    document.getElementById('rewardsTitle').textContent = copy.title;
    document.getElementById('spinTitle').textContent = copy.spinTitle;
    document.getElementById('spinDescription').textContent = copy.spinDescription;
    document.getElementById('spinReward').textContent = copy.spin;
    document.getElementById('quizTitle').textContent = copy.quizTitle;
    document.getElementById('quizQuestion').textContent = copy.question;
  }

  function requireLogin() {
    if (TM.getToken()) return true;
    TM.showToast(copy.login, 'error');
    window.setTimeout(() => { location.href = `auth.html?next=${encodeURIComponent('index.html#rewardsSection')}`; }, 700);
    return false;
  }

  async function play(path, body, output) {
    if (!requireLogin()) return;
    try {
      const result = await TM.apiRequest(path, { method: 'POST', body: JSON.stringify({ region: TM.currentRegion, ...body }) });
      output.textContent = result.won ? copy.won(result.percent, result.rewardCode) : copy.lost;
      output.classList.toggle('is-success', result.won);
      if (result.rewardCode) {
        output.title = result.rewardCode;
        output.addEventListener('click', () => navigator.clipboard?.writeText(result.rewardCode), { once: true });
      }
    } catch (error) {
      output.textContent = error.body?.code === 'DAILY_ATTEMPT_USED' ? copy.used : error.message;
      output.classList.remove('is-success');
    }
  }

  function install() {
    localize();
    document.getElementById('spinReward').addEventListener('click', async () => {
      const wheel = document.getElementById('rewardWheel');
      wheel.classList.remove('is-spinning');
      void wheel.offsetWidth;
      wheel.classList.add('is-spinning');
      await play('/rewards/spin', {}, document.getElementById('spinResult'));
    });
    document.querySelectorAll('[data-quiz-answer]').forEach((button) => button.addEventListener('click', () => {
      document.querySelectorAll('[data-quiz-answer]').forEach((item) => { item.disabled = true; });
      play('/rewards/quiz', { answer: button.dataset.quizAnswer }, document.getElementById('quizResult'))
        .finally(() => document.querySelectorAll('[data-quiz-answer]').forEach((item) => { item.disabled = false; }));
    }));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})();
