import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useStore } from '../store';

const lines = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

const text = {
  pl: {
    precision: 'Strefa precyzji',
    precisionText: 'Zatrzymaj wskaźnik w zielonym polu. Dopiero celne trafienie uruchamia dzienną próbę.',
    start: 'Uruchom', stop: 'Zatrzymaj', miss: 'Prawie — wskaźnik zatrzymał się poza polem. Spróbuj ponownie.',
    hit: 'Celnie! Losujemy małą, uczciwą nagrodę…', quiz: 'Tech quiz',
    quizText: 'Pięć pytań o technologię. Potrzebujesz co najmniej 4 poprawnych odpowiedzi.',
    question: 'Pytanie', of: 'z', score: 'Twój wynik', required: 'Do nagrody potrzeba 4/5.',
    ttt: 'Kółko i krzyżyk', tttText: 'Pokonaj sprytnego, ale omylnego bota. Zaczynasz jako X.',
    difficulty: 'Poziom: trudny', yourTurn: 'Twój ruch', botTurn: 'Bot myśli…', reset: 'Nowa plansza',
    won: 'Wygrana! Oto Twoja nagroda', lost: 'Bot wygrał. Możesz od razu zagrać ponownie.',
    draw: 'Remis. Spróbuj jeszcze raz.', copied: 'Kod skopiowany',
    used: 'Dzisiejsza nagroda z tej gry została już odebrana.', copyHint: 'kliknij kod, aby skopiować',
    loading: 'Ładuję pytania…', retry: 'Spróbuj ponownie',
    freeShipping: 'Darmowa dostawa', newDiscount: 'na nowy sprzęt ze sklepu', usedGift: 'prezent do używanego sprzętu',
    gifts: { care_kit: 'zestaw do czyszczenia', eco_pack: 'opakowanie ochronne', usb_c_cable: 'kabel USB‑C', device_inspection: 'bezpłatna kontrola urządzenia' },
  },
  uk: {
    precision: 'Зона точності', precisionText: 'Зупини вказівник у зеленому полі. Лише точне влучання запускає денну спробу.',
    start: 'Запустити', stop: 'Зупинити', miss: 'Майже — вказівник зупинився поза полем. Спробуй ще раз.',
    hit: 'Влучно! Визначаємо невелику чесну нагороду…', quiz: 'Техноквіз',
    quizText: 'П’ять запитань про техніку. Для перемоги потрібно щонайменше 4 правильні відповіді.',
    question: 'Питання', of: 'з', score: 'Твій результат', required: 'Для нагороди потрібно 4/5.',
    ttt: 'Хрестики-нулики', tttText: 'Переможи розумного, але не безпомилкового бота. Ти граєш за X.',
    difficulty: 'Рівень: складний', yourTurn: 'Твій хід', botTurn: 'Бот думає…', reset: 'Нова гра',
    won: 'Перемога! Ось твоя нагорода', lost: 'Бот переміг. Можна одразу зіграти ще раз.',
    draw: 'Нічия. Спробуй ще раз.', copied: 'Код скопійовано',
    used: 'Сьогоднішню нагороду з цієї гри вже отримано.', copyHint: 'натисни код, щоб скопіювати',
    loading: 'Завантажую запитання…', retry: 'Спробувати знову',
    freeShipping: 'Безкоштовна доставка', newDiscount: 'на нову техніку від магазину', usedGift: 'подарунок до вживаної техніки',
    gifts: { care_kit: 'набір для чищення', eco_pack: 'захисне пакування', usb_c_cable: 'кабель USB‑C', device_inspection: 'безкоштовна перевірка пристрою' },
  },
  en: {
    precision: 'Precision zone', precisionText: 'Stop the pointer inside the green field. Only a hit starts the daily attempt.',
    start: 'Start', stop: 'Stop', miss: 'Close — the pointer stopped outside the field. Try again.',
    hit: 'Great hit! Picking a small, fair reward…', quiz: 'Tech quiz',
    quizText: 'Five technology questions. You need at least 4 correct answers.',
    question: 'Question', of: 'of', score: 'Your score', required: 'You need 4/5 for a reward.',
    ttt: 'Tic-tac-toe', tttText: 'Beat a smart but fallible bot. You play as X.',
    difficulty: 'Level: hard', yourTurn: 'Your turn', botTurn: 'Bot is thinking…', reset: 'New board',
    won: 'You won! Here is your reward', lost: 'The bot won. You can retry now.', draw: 'Draw. Try again.',
    copied: 'Code copied', used: 'Today’s reward from this game has already been claimed.', copyHint: 'click the code to copy',
    loading: 'Loading questions…', retry: 'Try again',
    freeShipping: 'Free delivery', newDiscount: 'on new store items', usedGift: 'gift with a pre-owned item',
    gifts: { care_kit: 'care kit', eco_pack: 'protective packaging', usb_c_cable: 'USB‑C cable', device_inspection: 'free device inspection' },
  },
};

function resultFor(board) {
  const line = lines.find((candidate) => board[candidate[0]] && candidate.every((index) => board[index] === board[candidate[0]]));
  if (line) return { winner: board[line[0]], line };
  return board.every(Boolean) ? { winner: 'draw', line: [] } : { winner: null, line: [] };
}

function minimax(board, maximizing, depth = 0) {
  const result = resultFor(board).winner;
  if (result) return result === 'O' ? 10 - depth : result === 'X' ? depth - 10 : 0;
  const scores = [];
  board.forEach((cell, index) => {
    if (cell) return;
    const next = [...board];
    next[index] = maximizing ? 'O' : 'X';
    scores.push(minimax(next, !maximizing, depth + 1));
  });
  return maximizing ? Math.max(...scores) : Math.min(...scores);
}

function botMove(board) {
  const available = board.map((cell, index) => (cell ? null : index)).filter((value) => value !== null);
  if (!available.length) return null;
  // The bot now plays an optimal minimax move most of the time. A small error
  // chance keeps the daily reward achievable without making the board trivial.
  if (Math.random() < 0.08) return available[Math.floor(Math.random() * available.length)];
  let best = -Infinity;
  let choices = [];
  available.forEach((index) => {
    const next = [...board];
    next[index] = 'O';
    const score = minimax(next, false);
    if (score > best) { best = score; choices = [index]; }
    else if (score === best) choices.push(index);
  });
  return choices[Math.floor(Math.random() * choices.length)];
}

function Reward({ result, copy, hint, c }) {
  if (!result?.rewardCode) return null;
  const gift = c.gifts[result.giftKey] || c.usedGift;
  const title = result.rewardType === 'shipping' ? c.freeShipping : `${result.percent}% ${c.newDiscount}`;
  const alternative = result.rewardType === 'smart' ? `${gift} — ${c.usedGift}` : null;
  return (
    <button className="reward-code" type="button" onClick={() => { navigator.clipboard.writeText(result.rewardCode); copy(); }}>
      <span>{result.rewardType === 'shipping' ? '0 zł' : `${result.percent}%`}</span>
      <b>{title}</b>
      {alternative && <small>{alternative}</small>}
      <code>{result.rewardCode}</code>
      <small>{hint}</small>
    </button>
  );
}

export default function Games({ game }) {
  const { t, user, language, region, flash } = useStore();
  const c = text[language] || text.pl;
  const [position, setPosition] = useState(0);
  const positionRef = useRef(0);
  const startRef = useRef(0);
  const [running, setRunning] = useState(false);
  const [precisionMessage, setPrecisionMessage] = useState('');
  const [spinReward, setSpinReward] = useState(null);
  const [challenge, setChallenge] = useState(null);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState([]);
  const [quizResult, setQuizResult] = useState(null);
  const [quizBusy, setQuizBusy] = useState(false);
  const [quizLoading, setQuizLoading] = useState(game === 'quiz');
  const [quizError, setQuizError] = useState('');
  const [quizReload, setQuizReload] = useState(0);
  const [board, setBoard] = useState(Array(9).fill(null));
  const [gameMessage, setGameMessage] = useState('');
  const [tttReward, setTttReward] = useState(null);

  useEffect(() => {
    if (!user || game !== 'quiz') return;
    api(`/rewards/quiz?language=${language}`).then((data) => {
      setChallenge(data); setQuizIndex(0); setQuizAnswers([]);
      setQuizResult(data.attempted ? { won: false, used: true, correct: 0, total: data.total } : null);
    }).catch((error) => setQuizError(error.message)).finally(() => setQuizLoading(false));
  }, [game, language, user, quizReload]);

  useEffect(() => {
    if (!running) return undefined;
    let frame;
    const animate = (time) => {
      const phase = ((time - startRef.current) % 1900) / 1900;
      const next = phase < 0.5 ? phase * 200 : (1 - phase) * 200;
      positionRef.current = next;
      setPosition(next);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [running]);

  const gameState = useMemo(() => resultFor(board), [board]);
  const botTurn = !gameState.winner && board.filter(Boolean).length % 2 === 1;

  useEffect(() => {
    if (!botTurn) return undefined;
    const timer = setTimeout(() => {
      const index = botMove(board);
      if (index == null) return;
      const next = [...board]; next[index] = 'O'; setBoard(next);
      const result = resultFor(next).winner;
      if (result === 'O') setGameMessage(c.lost);
      if (result === 'draw') setGameMessage(c.draw);
    }, 520);
    return () => clearTimeout(timer);
  }, [board, botTurn, c.draw, c.lost]);

  const startPrecision = () => {
    startRef.current = performance.now(); positionRef.current = 0; setPosition(0);
    setPrecisionMessage(''); setSpinReward(null); setRunning(true);
  };
  const stopPrecision = async () => {
    const stoppedAt = positionRef.current;
    setRunning(false);
    if (stoppedAt < 47 || stoppedAt > 53) { setPrecisionMessage(c.miss); return; }
    setPrecisionMessage(c.hit);
    try {
      setSpinReward(await api('/rewards/spin', { method: 'POST', body: JSON.stringify({ region }) }));
      setPrecisionMessage('');
    } catch (error) {
      setPrecisionMessage(error.code === 'DAILY_ATTEMPT_USED' ? c.used : error.message);
    }
  };
  const answerQuiz = async (answer) => {
    if (quizBusy || quizResult) return;
    const question = challenge.questions[quizIndex];
    const nextAnswers = [...quizAnswers, { questionId: question.id, answer }];
    setQuizAnswers(nextAnswers);
    if (quizIndex < challenge.questions.length - 1) { setQuizIndex(quizIndex + 1); return; }
    setQuizBusy(true);
    try {
      setQuizResult(await api('/rewards/quiz', { method: 'POST', body: JSON.stringify({ answers: nextAnswers, region }) }));
    } catch (error) {
      if (error.code === 'DAILY_ATTEMPT_USED') {
        setQuizResult({ won: false, used: true, correct: 0, total: challenge.total });
      } else flash(error.message);
    } finally {
      setQuizBusy(false);
    }
  };
  const playCell = async (index) => {
    if (board[index] || gameState.winner || botTurn) return;
    const next = [...board]; next[index] = 'X'; setBoard(next);
    const result = resultFor(next).winner;
    if (result === 'X') {
      setGameMessage('…');
      try {
        setTttReward(await api('/rewards/tictactoe', { method: 'POST', body: JSON.stringify({ region, board: next }) }));
        setGameMessage(c.won);
      } catch (error) {
        setGameMessage(error.code === 'DAILY_ATTEMPT_USED' ? c.used : error.message);
      }
    } else if (result === 'draw') setGameMessage(c.draw);
  };
  const reset = () => { setBoard(Array(9).fill(null)); setGameMessage(''); setTttReward(null); };

  if (!user) return (
    <main className="games-login shell"><span className="eyebrow">NaShary Play</span><h1>{t('gameTitle')}</h1><p>{t('loginRequired')}</p><Link className="primary-button" to="/auth" state={{ from: `/games/${game}` }}>{t('login')}</Link></main>
  );

  const currentQuestion = challenge?.questions?.[quizIndex];
  return (
    <main className={`games-page games-page--single games-page--${game} shell`}>
      <header className="page-heading">
        <Link className="game-back" to="/games">← NaShary Play</Link>
        <h1>{game === 'precision' ? c.precision : game === 'quiz' ? c.quiz : c.ttt}</h1>
        <p>{game === 'precision' ? c.precisionText : game === 'quiz' ? c.quizText : c.tttText}</p>
      </header>
      <div className="games-grid">
        {game === 'precision' && <section className="game-panel game-panel--precision">
          <div className="game-number">01</div><h2>{c.precision}</h2><p>{c.precisionText}</p>
          <div className="precision-track"><span className="precision-zone" /><i style={{ left: `${position}%` }} /></div>
          <button className="primary-button" type="button" onClick={running ? stopPrecision : startPrecision}>{running ? c.stop : c.start}</button>
          {precisionMessage && <p className="game-status">{precisionMessage}</p>}
          <Reward result={spinReward} copy={() => flash(c.copied)} hint={c.copyHint} c={c} />
        </section>}
        {game === 'quiz' && <section className="game-panel game-panel--quiz">
          <div className="game-number">02</div><h2>{c.quiz}</h2><p>{c.quizText}</p>
          {quizLoading && <div className="game-loading-state"><span className="assistant-typing"><i /><i /><i /></span><p>{c.loading}</p></div>}
          {!quizLoading && quizError && <div className="game-error-state"><p>{quizError}</p><button className="quiet-button" type="button" onClick={() => { setQuizLoading(true); setQuizError(''); setQuizReload((value) => value + 1); }}>{c.retry}</button></div>}
          {currentQuestion && !quizResult && <div className="quiz">
            <div className="quiz-progress"><span>{c.question} {quizIndex + 1} {c.of} {challenge.total}</span><i><b style={{ width: `${((quizIndex + 1) / challenge.total) * 100}%` }} /></i></div>
            <b>{currentQuestion.prompt}</b>
            {currentQuestion.options.map((option) => <button disabled={quizBusy} type="button" key={option.value} onClick={() => answerQuiz(option.value)}>{option.label}</button>)}
          </div>}
          {quizResult && <div className={`quiz-result ${quizResult.won ? 'is-win' : ''}`}><strong>{quizResult.used ? c.used : `${c.score}: ${quizResult.correct}/${quizResult.total}`}</strong>{!quizResult.used && <span>{quizResult.won ? c.won : c.required}</span>}</div>}
          <Reward result={quizResult} copy={() => flash(c.copied)} hint={c.copyHint} c={c} />
        </section>}
        {game === 'tictactoe' && <section className="game-panel game-panel--ttt">
          <div className="game-number">03</div><h2>{c.ttt}</h2><p>{c.tttText}</p>
          <div className="ttt-meta"><span>{c.difficulty}</span><b>{botTurn ? c.botTurn : c.yourTurn}</b></div>
          <div className="ttt-board">
            {board.map((cell, index) => <button className={`${cell ? `is-${cell.toLowerCase()}` : ''} ${gameState.line.includes(index) ? 'is-winning' : ''}`} disabled={Boolean(cell) || Boolean(gameState.winner) || botTurn} type="button" key={index} onClick={() => playCell(index)} aria-label={`cell ${index + 1}`}>{cell}</button>)}
          </div>
          <div className="ttt-actions"><button className="quiet-button" type="button" onClick={reset}>{c.reset}</button><span>{gameMessage}</span></div>
          <Reward result={tttReward} copy={() => flash(c.copied)} hint={c.copyHint} c={c} />
        </section>}
      </div>
    </main>
  );
}
