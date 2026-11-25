import RewardRules from '../components/RewardRules';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
    precisionText: 'Zatrzymaj szybszy wskaźnik w bardzo wąskiej strefie. Jej pozycja i tempo zmieniają się przy każdym starcie.',
    start: 'Uruchom', stop: 'Zatrzymaj', miss: 'Prawie — wskaźnik zatrzymał się poza polem. Spróbuj ponownie.',
    hit: 'Celnie! Przygotowujemy nagrodę…', quiz: 'Tech quiz',
    quizText: 'Osiem pytań z różnych dziedzin technologii. Do nagrody potrzebujesz co najmniej 7 poprawnych odpowiedzi.',
    question: 'Pytanie', of: 'z', score: 'Twój wynik', required: 'Do nagrody potrzeba 7/8.',
    ttt: 'Kółko i krzyżyk', tttText: 'Pokonaj sprytnego, ale omylnego bota. Zaczynasz jako X.',
    difficulty: 'Poziom: trudny', yourTurn: 'Twój ruch', botTurn: 'Bot myśli…', reset: 'Nowa plansza',
    won: 'Wygrana! Oto Twoja nagroda', lost: 'Bot wygrał. Możesz od razu zagrać ponownie.',
    draw: 'Remis. Spróbuj jeszcze raz.', copied: 'Kod skopiowany',
    used: 'Dzisiejsza nagroda z tej gry została już odebrana.', copyHint: 'kliknij kod, aby skopiować',
    review: 'Sprawdź odpowiedzi', yourAnswer: 'Twoja odpowiedź', correctAnswer: 'Poprawna odpowiedź', quizUsed: 'Dzisiejsza próba została już zakończona.', tomorrow: 'Kolejna próba jutro.',
    loading: 'Ładuję pytania…', retry: 'Spróbuj ponownie',
    freeShipping: 'Darmowa dostawa', newDiscount: 'na nowy sprzęt ze sklepu', usedGift: 'prezent do używanego sprzętu',
    gifts: { care_kit: 'zestaw do czyszczenia', eco_pack: 'opakowanie ochronne', usb_c_cable: 'kabel USB‑C', device_inspection: 'bezpłatna kontrola urządzenia' },
  },
  uk: {
    precision: 'Зона точності', precisionText: 'Зупини швидший вказівник у дуже вузькій зоні. Її позиція та швидкість змінюються під час кожного запуску.',
    start: 'Запустити', stop: 'Зупинити', miss: 'Майже — вказівник зупинився поза полем. Спробуй ще раз.',
    hit: 'Влучно! Визначаємо невелику чесну нагороду…', quiz: 'Техноквіз',
    quizText: 'Вісім запитань із різних сфер технологій. Для нагороди потрібно щонайменше 7 правильних відповідей.',
    question: 'Питання', of: 'з', score: 'Твій результат', required: 'Для нагороди потрібно 7/8.',
    ttt: 'Хрестики-нулики', tttText: 'Переможи розумного, але не безпомилкового бота. Ти граєш за X.',
    difficulty: 'Рівень: складний', yourTurn: 'Твій хід', botTurn: 'Бот думає…', reset: 'Нова гра',
    won: 'Перемога! Ось твоя нагорода', lost: 'Бот переміг. Можна одразу зіграти ще раз.',
    draw: 'Нічия. Спробуй ще раз.', copied: 'Код скопійовано',
    used: 'Сьогоднішню нагороду з цієї гри вже отримано.', copyHint: 'натисни код, щоб скопіювати',
    review: 'Переглянути відповіді', yourAnswer: 'Твоя відповідь', correctAnswer: 'Правильна відповідь', quizUsed: 'Сьогоднішню спробу вже завершено.', tomorrow: 'Наступна спроба завтра.',
    loading: 'Завантажую запитання…', retry: 'Спробувати знову',
    freeShipping: 'Безкоштовна доставка', newDiscount: 'на нову техніку від магазину', usedGift: 'подарунок до вживаної техніки',
    gifts: { care_kit: 'набір для чищення', eco_pack: 'захисне пакування', usb_c_cable: 'кабель USB‑C', device_inspection: 'безкоштовна перевірка пристрою' },
  },
  en: {
    precision: 'Precision zone', precisionText: 'Stop the faster pointer inside a very narrow zone. Its position and speed change on every start.',
    start: 'Start', stop: 'Stop', miss: 'Close — the pointer stopped outside the field. Try again.',
    hit: 'Great hit! Picking a small, fair reward…', quiz: 'Tech quiz',
    quizText: 'Eight questions from different areas of technology. You need at least 7 correct answers.',
    question: 'Question', of: 'of', score: 'Your score', required: 'You need 7/8 for a reward.',
    ttt: 'Tic-tac-toe', tttText: 'Beat a smart but fallible bot. You play as X.',
    difficulty: 'Level: hard', yourTurn: 'Your turn', botTurn: 'Bot is thinking…', reset: 'New board',
    won: 'You won! Here is your reward', lost: 'The bot won. You can retry now.', draw: 'Draw. Try again.',
    copied: 'Code copied', used: 'Today’s reward from this game has already been claimed.', copyHint: 'click the code to copy',
    review: 'Review your answers', yourAnswer: 'Your answer', correctAnswer: 'Correct answer', quizUsed: 'Today’s attempt has already been completed.', tomorrow: 'Next attempt tomorrow.',
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

function Reward({ result, copy, hint, c }) {
  const { formatPrice, language } = useStore();
  if (!result?.rewardCode) return null;
  const gift = c.gifts[result.giftKey] || c.usedGift;
  const shippingTitle = { uk: 'Знижка на доставку', pl: 'Rabat na dostawę', en: 'Shipping discount' }[language];
  const title = result.rewardType === 'shipping' ? shippingTitle : `${result.percent}% ${c.newDiscount}`;
  const alternative = result.rewardType === 'smart' ? `${gift} — ${c.usedGift}` : null;
  return (
    <button className="reward-code" type="button" onClick={() => { navigator.clipboard.writeText(result.rewardCode).then(copy).catch(() => {}); }}>
      <span>{result.rewardType === 'shipping' ? formatPrice((result.maxDiscountCents || 0) / 100, result.currency) : `${result.percent}%`}</span>
      <b>{title}</b>
      {alternative && <small>{alternative}</small>}
      {result.maxDiscountCents != null && <small>{language === 'uk' ? 'Максимум' : language === 'en' ? 'Maximum' : 'Maksymalnie'}: {formatPrice(result.maxDiscountCents / 100, result.currency)}</small>}
      <small>{language === 'uk' ? '7 днів · один раз · нова техніка магазину' : language === 'en' ? '7 days · single use · new store devices' : '7 dni · jeden raz · nowy sprzęt sklepu'}</small>
      <code>{result.rewardCode}</code>
      <small>{hint}</small>
    </button>
  );
}

function GamesContent({ game }) {
  const { t, user, language, region, flash } = useStore();
  const c = text[language] || text.pl;
  const [position, setPosition] = useState(0);
  const positionRef = useRef(0);
  const startRef = useRef(0);
  const precisionCycleRef = useRef(1250);
  const [precisionTarget, setPrecisionTarget] = useState(50);
  const [running, setRunning] = useState(false);
  const [precisionMessage, setPrecisionMessage] = useState('');
  const [spinReward, setSpinReward] = useState(null);
  const [challenge, setChallenge] = useState(null);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizResult, setQuizResult] = useState(null);
  const [quizBusy, setQuizBusy] = useState(false);
  const [quizLoading, setQuizLoading] = useState(game === 'quiz');
  const [quizError, setQuizError] = useState('');
  const [quizReload, setQuizReload] = useState(0);
  const quizAnswerGate = useRef(false);
  const [board, setBoard] = useState(Array(9).fill(null));
  const [gameMessage, setGameMessage] = useState('');
  const [tttReward, setTttReward] = useState(null);
  const [tttBusy, setTttBusy] = useState(false);
  const [tttLoading, setTttLoading] = useState(game === 'tictactoe');
  const [tttSession, setTttSession] = useState(null);
  const tttGate = useRef(false);
  const receiveGame = useCallback((data) => {
    setBoard(data.board); setTttSession({ id: data.sessionId, revision: data.revision });
    setTttReward(data.reward);
    setGameMessage(data.reward?.used ? c.used : data.winner === 'X' ? c.won : data.winner === 'O' ? c.lost : data.winner === 'draw' ? c.draw : '');
  }, [c.used, c.won, c.lost, c.draw]);

  useEffect(() => {
    if (!user || game !== 'tictactoe') return;
    let active = true;
    api('/rewards/tictactoe/current').then((data) => {
      if (!active) return;
      if (data.region === region) receiveGame(data);
      else { setBoard(Array(9).fill(null)); setTttSession(null); setTttReward(null); setGameMessage(''); }
    }).catch((error) => { if (active && ![404, 410].includes(error.status)) setGameMessage(error.message); }).finally(() => { if (active) setTttLoading(false); });
    return () => { active = false; };
  }, [user, game, region, receiveGame]);

  const receiveQuiz = useCallback((data) => {
    setChallenge(data); setQuizIndex(data.revision || 0); setQuizError('');
    setQuizResult(data.result || (data.attempted ? { won: false, used: true, correct: 0, total: data.total } : null));
  }, []);

  useEffect(() => {
    if (!user || game !== 'quiz') return;
    let active = true;
    api(`/rewards/quiz?language=${language}&region=${region}`).then((data) => {
      if (!active) return;
      receiveQuiz(data);
    }).catch((error) => { if (active) setQuizError(error.message); }).finally(() => { if (active) setQuizLoading(false); });
    return () => { active = false; };
  }, [game, language, user, quizReload, region, receiveQuiz]);

  useEffect(() => { quizAnswerGate.current = false; }, [quizIndex, challenge]);

  useEffect(() => {
    if (!running) return undefined;
    let frame;
    const animate = (time) => {
      const phase = ((time - startRef.current) % precisionCycleRef.current) / precisionCycleRef.current;
      const next = phase < 0.5 ? phase * 200 : (1 - phase) * 200;
      positionRef.current = next;
      setPosition(next);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [running]);

  const gameState = useMemo(() => resultFor(board), [board]);
  const botTurn = tttBusy || tttLoading;

  const startPrecision = () => {
    const nextTarget = 18 + Math.random() * 64;
    precisionCycleRef.current = 1050 + Math.random() * 350;
    setPrecisionTarget(nextTarget);
    startRef.current = performance.now(); positionRef.current = 0; setPosition(0);
    setPrecisionMessage(''); setSpinReward(null); setRunning(true);
  };
  const stopPrecision = async () => {
    const stoppedAt = positionRef.current;
    setRunning(false);
    if (Math.abs(stoppedAt - precisionTarget) > 1.75) { setPrecisionMessage(c.miss); return; }
    setPrecisionMessage(c.hit);
    try {
      setSpinReward(await api('/rewards/spin', { method: 'POST', body: JSON.stringify({ region }) }));
      setPrecisionMessage('');
    } catch (error) {
      setPrecisionMessage(error.code === 'DAILY_ATTEMPT_USED' ? c.used : error.message);
    }
  };
  const answerQuiz = async (answer) => {
    if (quizBusy || quizResult || quizAnswerGate.current || !challenge?.questions?.[quizIndex]) return;
    quizAnswerGate.current = true; setQuizBusy(true);
    const question = challenge.questions[quizIndex];
    try {
      receiveQuiz(await api('/rewards/quiz/answer', { method: 'POST', body: JSON.stringify({ sessionId: challenge.sessionId, revision: challenge.revision, questionId: question.id, answer, language }) }));
    } catch (error) {
      try { receiveQuiz(await api(`/rewards/quiz?language=${language}&region=${region}`)); }
      catch { setQuizError(error.message); }
    } finally { quizAnswerGate.current = false; setQuizBusy(false); }
  };
  const playCell = async (index) => {
    if (board[index] || gameState.winner || botTurn || tttGate.current) return;
    tttGate.current = true; setTttBusy(true);
    let session = tttSession;
    try {
      if (!session) {
        const started = await api('/rewards/tictactoe/start', { method: 'POST', body: JSON.stringify({ region }) });
        session = { id: started.sessionId, revision: started.revision }; setTttSession(session);
      }
      const next = [...board]; next[index] = 'X'; setBoard(next);
      receiveGame(await api(`/rewards/tictactoe/${session.id}/moves`, { method: 'POST', body: JSON.stringify({ cell: index, revision: session.revision }) }));
    } catch (error) {
      // A lost response may still have committed the move. Read the server board before retrying.
      if (session) {
        try { receiveGame(await api(`/rewards/tictactoe/${session.id}`)); }
        catch { setBoard(board); setGameMessage(error.message); }
      } else setGameMessage(error.message);
    } finally { tttGate.current = false; setTttBusy(false); }
  };
  const reset = async () => {
    if (tttGate.current) return;
    tttGate.current = true; setTttBusy(true);
    try { receiveGame(await api('/rewards/tictactoe/start', { method: 'POST', body: JSON.stringify({ region }) })); }
    catch (error) { setGameMessage(error.message); }
    finally { tttGate.current = false; setTttBusy(false); }
  };

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
          <div className="precision-track"><span className="precision-zone" style={{ left: `${precisionTarget - 1.75}%` }} /><i style={{ left: `${position}%` }} /></div>
          <button className="primary-button" type="button" onClick={running ? stopPrecision : startPrecision}>{running ? c.stop : c.start}</button>
          {precisionMessage && <p className="game-status">{precisionMessage}</p>}
          <Reward result={spinReward} copy={() => flash(c.copied)} hint={c.copyHint} c={c} />
        </section>}
        {game === 'quiz' && <section className="game-panel game-panel--quiz">
          <div className="game-number">02</div><h2>{c.quiz}</h2><p>{c.quizText}</p>
          {quizLoading && <div className="game-loading-state"><span className="assistant-typing"><i /><i /><i /></span><p>{c.loading}</p></div>}
          {!quizLoading && quizError && <div className="game-error-state"><p>{quizError}</p><button className="quiet-button" type="button" onClick={() => { setQuizLoading(true); setQuizError(''); setQuizReload((value) => value + 1); }}>{c.retry}</button></div>}
          {currentQuestion && !quizResult && !quizError && <div className="quiz">
            <p className="sales-note">{language === 'uk' ? 'Нагорода для ринку' : language === 'en' ? 'Reward market' : 'Rynek nagrody'}: {challenge.region?.toUpperCase()}</p>
            <div className="quiz-progress"><span>{c.question} {quizIndex + 1} {c.of} {challenge.total}</span><i><b style={{ width: `${((quizIndex + 1) / challenge.total) * 100}%` }} /></i></div>
            <b>{currentQuestion.prompt}</b>
            {currentQuestion.options.map((option) => <button disabled={quizBusy} type="button" key={option.value} onClick={() => answerQuiz(option.value)}>{option.label}</button>)}
          </div>}
          {quizResult && <div className={`quiz-result ${quizResult.won ? 'is-win' : ''}`}><strong>{quizResult.used ? c.quizUsed : `${c.score}: ${quizResult.correct}/${quizResult.total}`}</strong>{!quizResult.used && <span>{quizResult.won ? c.won : `${c.required} ${c.tomorrow}`}</span>}</div>}
          {quizResult?.review?.length > 0 && <details className="quiz-review"><summary>{c.review}</summary><ol>{quizResult.review.map((item) => {
            const question = challenge.questions.find((entry) => entry.id === item.questionId);
            if (!question) return null;
            const label = (value) => question.options.find((option) => option.value === value)?.label || value;
            return <li key={item.questionId}><b>{question.prompt}</b><p>{c.yourAnswer}: {label(item.selectedValue)} {item.selectedValue === item.correctValue ? '✓' : ''}</p>{item.selectedValue !== item.correctValue && <p>{c.correctAnswer}: {label(item.correctValue)}</p>}</li>;
          })}</ol></details>}
          <Reward result={quizResult} copy={() => flash(c.copied)} hint={c.copyHint} c={c} />
        </section>}
        {game === 'tictactoe' && <section className="game-panel game-panel--ttt">
          <div className="game-number">03</div><h2>{c.ttt}</h2><p>{c.tttText}</p>
          <div className="ttt-meta"><span>{c.difficulty}</span><b>{botTurn ? c.botTurn : c.yourTurn}</b></div>
          <div className="ttt-board">
            {board.map((cell, index) => <button className={`${cell ? `is-${cell.toLowerCase()}` : ''} ${gameState.line.includes(index) ? 'is-winning' : ''}`} disabled={Boolean(cell) || Boolean(gameState.winner) || botTurn} type="button" key={index} onClick={() => playCell(index)} aria-label={`cell ${index + 1}`}>{cell}</button>)}
          </div>
          <div className="ttt-actions"><button className="quiet-button" type="button" disabled={tttBusy} onClick={reset}>{c.reset}</button><span role="status">{gameMessage}</span></div>
          <Reward result={tttReward} copy={() => flash(c.copied)} hint={c.copyHint} c={c} />
        </section>}
      </div>
      <RewardRules />
    </main>
  );
}

export default function Games({ game }) {
  const { user, region } = useStore();
  return <GamesContent key={`${game}:${user?.id || 'guest'}:${region}`} game={game}/>;
}
