import { Link } from 'react-router-dom';
import { useStore } from '../store';

const copy = {
  pl: {
    label: 'NaShary Play',
    title: 'Wybierz swoją próbę',
    lead: 'Każda gra ma osobną arenę i jedną nagradzaną próbę dziennie.',
    precision: ['Refleks', 'Zatrzymaj wskaźnik w wąskiej strefie.'],
    quiz: ['Tech quiz', 'Osiem pytań z technologii — potrzebujesz 7 dobrych odpowiedzi.'],
    ttt: ['Kółko i krzyżyk', 'Wygraj ze sprytnym botem.'],
    enter: 'Wejdź do gry',
  },
  uk: {
    label: 'NaShary Play',
    title: 'Обери своє випробування',
    lead: 'Кожна гра має окрему арену й одну нагороджувану спробу на день.',
    precision: ['Реакція', 'Зупини вказівник у вузькій зоні.'],
    quiz: ['Техноквіз', 'Вісім запитань про технології — потрібно 7 правильних відповідей.'],
    ttt: ['Хрестики-нулики', 'Переможи кмітливого бота.'],
    enter: 'Відкрити гру',
  },
  en: {
    label: 'NaShary Play',
    title: 'Choose your challenge',
    lead: 'Each game has its own arena and one rewarded attempt per day.',
    precision: ['Reflex', 'Stop the pointer inside a narrow zone.'],
    quiz: ['Tech quiz', 'Eight technology questions — you need 7 correct answers.'],
    ttt: ['Tic-tac-toe', 'Beat a clever bot.'],
    enter: 'Open game',
  },
};

export default function GamesHub() {
  const { language } = useStore();
  const c = copy[language] || copy.pl;
  const games = [
    [
      'precision',
      '01',
      c.precision,
      <>
        <i />
        <i />
        <i />
      </>,
    ],
    [
      'quiz',
      '02',
      c.quiz,
      <>
        <b>?</b>
        <span>A</span>
      </>,
    ],
    [
      'tictactoe',
      '03',
      c.ttt,
      <>
        <b>×</b>
        <span>○</span>
        <b>×</b>
        <span>○</span>
      </>,
    ],
  ];
  return (
    <main className="games-hub shell">
      <header className="page-heading">
        <span className="eyebrow">{c.label}</span>
        <h1>{c.title}</h1>
        <p>{c.lead}</p>
      </header>
      <div className="game-choice-grid">
        {games.map(([slug, number, item, art]) => (
          <Link className={`game-choice game-choice--${slug}`} to={`/games/${slug}`} key={slug}>
            <span className="game-choice__number">{number}</span>
            <div className="game-choice__art">{art}</div>
            <div>
              <h2>{item[0]}</h2>
              <p>{item[1]}</p>
              <b>{c.enter} →</b>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
