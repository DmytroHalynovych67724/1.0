# NaShary — маркетплейс електроніки

[![CI](https://github.com/DmytroHalynovych67724/1.0/actions/workflows/ci.yml/badge.svg)](https://github.com/DmytroHalynovych67724/1.0/actions/workflows/ci.yml)
[![Docker Publish](https://github.com/DmytroHalynovych67724/1.0/actions/workflows/docker-publish.yml/badge.svg)](https://github.com/DmytroHalynovych67724/1.0/actions/workflows/docker-publish.yml)

## Turso та безплатний Render

Backend автоматично використовує Turso, якщо одночасно задані
`TURSO_DATABASE_URL` і `TURSO_AUTH_TOKEN`. Без них локальна розробка працює
через SQLite у `DB_PATH`. Тести завжди створюють окрему тимчасову SQLite-базу
та ніколи не підключаються до Turso.

Для безплатного розгортання backend:

1. У Render оберіть **New → Blueprint** і репозиторій цього проєкту.
2. Render прочитає `render.yaml`. Введіть чотири секретні значення:
   `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `ADMIN_USERNAME` і
   `ADMIN_PASSWORD` (пароль щонайменше 12 символів).
3. Після успішного deploy відкрийте
   `https://<назва-сервісу>.onrender.com/api/health?details=1`. Правильна
   відповідь містить `"status":"ok"` і `"database":"turso"`.
4. Один раз виконайте `npm run seed` локально з тими самими Turso та admin
   змінними, щоб додати демонстраційний каталог і створити адміністратора.
5. У GitHub відкрийте **Settings → Secrets and variables → Actions →
   Variables**, створіть `VITE_API_URL` зі значенням публічної адреси Render
   без кінцевого `/`, після чого повторно запустіть workflow **Deploy GitHub
   Pages**.

Секрети з `.env` не додаються до Git. `render.yaml` містить лише назви змінних,
а не їхні значення.

## GitHub Pages

Кожен push у `master` автоматично збирає React-версію та публікує її через GitHub Pages.
Якщо окремий сервер ще не підключено, сторінка запускається з вбудованим демонстраційним
каталогом: перегляд, фільтри, порівняння, обране та локальний кошик залишаються доступними.

GitHub Pages не запускає Express і SQLite. Для повної роботи акаунтів, чатів, замовлень,
нагород мініігор та Open Icecat потрібно окремо розгорнути Node.js backend і додати в
`Settings → Secrets and variables → Actions → Variables` змінну `VITE_API_URL` з його
публічною адресою, наприклад `https://api.example.com`. У CORS backend слід дозволити
origin `https://dmytrohalynovych67724.github.io`.

NaShary — дипломний вебпроєкт у форматі спеціалізованого маркетплейсу на кшталт OLX, але лише для електроніки. У каталозі можна продавати нову та вживану техніку: смартфони, ноутбуки, комп’ютери, ігрові консолі, аудіо-, фото- й відеотехніку та аксесуари.

Маркетплейс поділено на три ринки: Польща (`PLN`), Україна (`UAH`) та Європа (`EUR`).
Інтерфейс підтримує польську, українську та англійську мови; польська й польський
регіон використовуються за замовчуванням.

## Можливості

- каталог із пошуком, фільтрами за категорією, брендом, станом і ціною та сортуванням;
- окрема сторінка оголошення з характеристиками, продавцем, локацією й доставкою;
- товари зі станом `new` або `used`, залишком на складі та даними продавця;
- обране й кошик зі збереженням стану в `localStorage`;
- перемикач `PL / UK / EN` зі збереженням вибраної мови;
- незалежний перемикач регіону `PL / UA / EU`, локальні каталоги й валюти;
- світла й темна теми з автоматичним визначенням системної теми та ручним перемикачем;
- профілі користувачів із власними аватарами;
- автоматичне розпізнавання моделей і характеристик через Open Icecat із локальним
  резервом та пошуком за GTIN/MPN;
- реєстрація, вхід і перевірка поточного користувача через JWT;
- рольова модель `user` / `admin`: користувачі публікують власні оголошення, адміністратор модерує всі;
- оформлення замовлень із серверним розрахунком суми, перевіркою залишків і захистом
  від змішування товарів з різних регіонів;
- checkout із контактами, доставкою, адресою, коментарем і регіональними промокодами;
- захищений чат покупця з продавцем для конкретного оголошення;
- видалення власних повідомлень без можливості видаляти чужі;
- торг у чаті: пропозиція, відхилення, прийняття, контрпропозиція та погоджена ціна в checkout;
- статуси замовлення, історія змін, оцінки після завершеної покупки й ручна demo-верифікація;
- локальний помічник із пошуком лише по реальному каталогу;
- окремий центр мініігор і три самостійні ігрові сторінки: зона точності, локалізований tech-quiz і хрестики-нулики проти AI з персональними серверними промокодами на 7 днів;
- історія власних замовлень; адміністратор бачить усі замовлення;
- SQLite, автоматична ініціалізація схеми та безпечні міграції;
- Helmet, CORS, rate limiting, централізовані помилки та валідація API;
- автоматичні тести, ESLint, GitHub Actions, Docker і конфігурація PM2.

## Технології

- Frontend: React 19, React Router, Vite, адаптивний CSS;
- Backend: Node.js, Express;
- база даних: SQLite через `better-sqlite3`;
- авторизація: JWT і `bcryptjs`;
- QA: Node.js Test Runner, ESLint, Prettier;
- запуск і доставка: Docker Compose, PM2, GitHub Actions.

## Швидкий запуск

Потрібні Node.js 20 LTS або новіший та npm. Застосунок сумісний із Node.js 18+, але CI і Docker використовують Node.js 20.

```powershell
npm ci
Copy-Item .env.example .env
```

Відкрийте `.env`, задайте випадковий `JWT_SECRET` довжиною щонайменше 32 байти та надійний `ADMIN_PASSWORD`. Секрет можна згенерувати так:

```powershell
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

Після налаштування середовища:

```powershell
npm run seed
npm run dev
```

Відкрийте:

- React-застосунок у dev-режимі: <http://localhost:5173>;
- вхід і реєстрація: <http://localhost:5173/auth>;
- кабінет продавця й модератора: <http://localhost:5173/account>;
- мініігри: <http://localhost:5173/games>;
- перевірка API: <http://localhost:3000/api/health>.

`npm run seed` можна запускати повторно: він не дублює адміністратора чи початкові товари. Для входу адміністратора використовуйте `ADMIN_USERNAME` і `ADMIN_PASSWORD` із вашого `.env`.

На Windows файл `start-project.bat` встановлює залежності за потреби, створює `.env`, ідемпотентно виконує `npm run seed` і запускає dev-сервер. Якщо `ADMIN_PASSWORD` порожній, лише в development seed може створити демонстраційний обліковий запис `admin` / `admin123` із попередженням. Для дипломної демонстрації та будь-якого розгортання явно задайте власний пароль; production не приймає порожній чи слабкий пароль.

## Змінні середовища

| Змінна                 | Обов’язковість        | Призначення                                               |
| ---------------------- | --------------------- | --------------------------------------------------------- |
| `PORT`                 | ні                    | HTTP-порт, типово `3000`                                  |
| `NODE_ENV`             | ні                    | `development`, `test` або `production`                    |
| `DB_PATH`              | ні                    | шлях до SQLite; типово `data/db.sqlite`                   |
| `JWT_SECRET`           | так для production    | унікальний секрет JWT, щонайменше 32 байти                |
| `ADMIN_USERNAME`       | для seed/bootstrap    | логін початкового адміністратора                          |
| `ADMIN_PASSWORD`       | для seed/bootstrap    | пароль початкового адміністратора                         |
| `CORS_ORIGIN`          | для окремого frontend | дозволені origin через кому; для same-origin не потрібний |
| `ICECAT_ENABLED`       | ні                    | вмикає автоматичні характеристики Open Icecat             |
| `ICECAT_USERNAME`      | для власного Icecat   | ім’я Open Icecat; demo: `openIcecat-live`                 |
| `ICECAT_API_TOKEN`     | для власного Icecat   | серверний токен доступу до карток товарів                 |
| `ICECAT_CONTENT_TOKEN` | для медіа Icecat      | серверний токен доступу до захищених матеріалів           |
| `ICECAT_LANGUAGE`      | ні                    | стабільна мова полів API, типово `EN`                     |

Не додавайте `.env`, робочу базу або production-секрети до Git.

## Команди npm

| Команда                | Дія                                                |
| ---------------------- | -------------------------------------------------- |
| `npm run dev`          | React dev-сервер і API з автоматичним перезапуском |
| `npm run build`        | production-збірка React                            |
| `npm start`            | API та готова React-збірка на порту 3000           |
| `npm run seed`         | початкові товари й обліковий запис адміністратора  |
| `npm test`             | усі автоматичні тести                              |
| `npm run test:api`     | лише інтеграційні тести API                        |
| `npm run lint`         | статичний аналіз JavaScript                        |
| `npm run check`        | lint і тести однією командою                       |
| `npm run format`       | форматування через Prettier                        |
| `npm run docker:build` | складання Docker image                             |
| `npm run docker:up`    | запуск через Docker Compose                        |

## API

Усі тіла запитів і відповідей використовують JSON. Захищені маршрути очікують заголовок `Authorization: Bearer <token>`.

### Авторизація

| Метод і маршрут           | Доступ     | Опис                             |
| ------------------------- | ---------- | -------------------------------- |
| `POST /api/auth/register` | публічний  | створення звичайного користувача |
| `POST /api/auth/login`    | публічний  | отримання JWT                    |
| `GET /api/auth/me`        | користувач | поточний профіль без хешу пароля |

Поле `role` у запиті реєстрації ігнорується: публічна реєстрація завжди створює роль `user`.

### Товари

| Метод і маршрут               | Доступ           | Опис                                                  |
| ----------------------------- | ---------------- | ----------------------------------------------------- |
| `GET /api/products`           | публічний        | каталог, пошук, регіон, фільтрація й сортування       |
| `GET /api/products/mine`      | користувач/admin | власні або всі оголошення для керування               |
| `GET /api/products/:id`       | публічний        | одне оголошення                                       |
| `POST /api/products`          | користувач/admin | створення оголошення                                  |
| `PUT/PATCH /api/products/:id` | власник/admin    | повне або часткове оновлення                          |
| `DELETE /api/products/:id`    | власник/admin    | видалення оголошення                                  |
| `GET /api/device-specs?q=…`   | користувач/admin | Open Icecat, GTIN/MPN і резервний пошук характеристик |

### Чати

| Метод і маршрут                        | Доступ     | Опис                                       |
| -------------------------------------- | ---------- | ------------------------------------------ |
| `GET /api/chats`                       | користувач | власні діалоги покупця або продавця        |
| `POST /api/chats`                      | користувач | відкрити діалог для конкретного оголошення |
| `GET /api/chats/:id/messages`          | учасник    | повідомлення та відмітка прочитання        |
| `POST /api/chats/:id/messages`         | учасник    | надіслати повідомлення                     |
| `POST /api/chats/:id/offers`           | учасник    | запропонувати або назвати зустрічну ціну   |
| `PATCH /api/chats/:id/offers/:offerId` | отримувач  | прийняти або відхилити ціну                |

### Довіра та винагороди

| Метод і маршрут                           | Доступ     | Опис                                  |
| ----------------------------------------- | ---------- | ------------------------------------- |
| `POST /api/trust/reviews`                 | покупець   | оцінка після завершеного замовлення   |
| `GET /api/trust/sellers/:id/reviews`      | публічний  | рейтинг і відгуки продавця            |
| `PATCH /api/trust/users/:id/verification` | admin      | demo-верифікація профілю              |
| `POST /api/rewards/spin`                  | користувач | нагорода за щоденну гру на точність   |
| `GET/POST /api/rewards/quiz`              | користувач | локалізована щоденна tech-вікторина   |
| `POST /api/rewards/tictactoe`             | користувач | перевірена перемога у хрестики-нулики |

Параметри каталогу: `q`, `category`, `brand`, `condition`, `minPrice`, `maxPrice`, `inStock` і `sort`. Значення `sort`: `newest`, `oldest`, `price_asc`, `price_desc`.

Приклад валідного товару:

```json
{
  "title": "iPhone 15 128GB",
  "description": "Комплектний смартфон у відмінному стані",
  "price": 2999.99,
  "images": ["https://example.com/iphone.jpg"],
  "category": "Smartfony",
  "location": "Warszawa",
  "condition": "used",
  "brand": "Apple",
  "stock": 1,
  "seller": "Jan Kowalski",
  "sellerType": "private",
  "delivery": "both"
}
```

`condition` приймає `new` або `used`, `sellerType` — `store` або `private`, `delivery` — `shipping`, `pickup` або `both`.

Для звичайного користувача сервер не довіряє полям продавця з body: він записує `seller` з авторизованого username, примусово встановлює `sellerType: "private"` і зберігає власника в `createdBy`. Чуже оголошення може змінити або видалити лише адміністратор.

### Замовлення

| Метод і маршрут       | Доступ           | Опис                      |
| --------------------- | ---------------- | ------------------------- |
| `POST /api/orders`    | користувач       | створення замовлення      |
| `GET /api/orders`     | користувач/admin | власні або всі замовлення |
| `GET /api/orders/:id` | власник/admin    | одне замовлення           |

Для оформлення потрібно передати лише ідентифікатори та кількість:

```json
{
  "items": [{ "id": "product-id", "qty": 2 }]
}
```

Клієнт не визначає підсумкову ціну. Сервер читає актуальні ціни з БД, рахує суму в цілих сотих частинах PLN без похибок чисел із рухомою комою, створює snapshot позицій і в одній транзакції зменшує залишки. За недостатнього залишку замовлення не створюється.

## Тести й безпека локальної БД

```powershell
npm test
npm run lint
```

Інтеграційні тести API створюють окремий каталог у системній тимчасовій директорії, задають власний `DB_PATH`, а після завершення закривають SQLite і видаляють лише цю директорію. Вони не підключаються до `data/db.sqlite` і не виконують очищення робочої бази.

Тести перевіряють health endpoint, реєстрацію та вхід, неможливість підвищити власну роль, власність і модерацію оголошень, валідацію й CRUD товарів, пошук і фільтри, серверний розрахунок замовлення, залишки та доступ власника до замовлень.

GitHub Actions запускає `npm run check` для кожного push і pull request.

Workflow `docker-publish.yml` публікує `ghcr.io/<owner>/na-shary-marketplace` після push у `main` або `master`. Якщо додати secrets `DOCKERHUB_USERNAME` і `DOCKERHUB_TOKEN`, той самий image також публікується в Docker Hub.

## Docker

Спочатку створіть і заповніть `.env`, як описано у швидкому запуску. Compose навмисно відмовиться стартувати без `JWT_SECRET` та `ADMIN_PASSWORD`.

```powershell
docker compose up --build -d
docker compose exec web npm run seed
docker compose ps
```

SQLite зберігається у змонтованому каталозі `./data`, тому перевипуск контейнера не видаляє дані. У Docker image потрапляють лише production-залежності, backend і frontend; в image також налаштований healthcheck `/api/health`.

Зупинка:

```powershell
docker compose down
```

## PM2

```powershell
npm ci
npm run seed
npx pm2 start ecosystem.config.js
npx pm2 status
```

PM2 не замінює HTTPS. Для публічного розгортання використовуйте reverse proxy, TLS, окремі production-секрети та регулярне резервне копіювання SQLite.

## Структура

```text
backend/
  app.js                 Express application
  db.js                  SQLite initialization and migrations
  middleware/            authentication and role checks
  models/                product and order data access
  routes/                REST API routes
  utils/                 validation and structured errors
frontend/
  index.html             Vite entry point
  vite.config.mjs        React build and development server configuration
  assets/                shared product placeholders and category artwork
  src/
    components/          reusable React interface components
    pages/               marketplace routes and screens
    api.js               API client and GitHub Pages catalog fallback
    store.jsx            session, cart, favorites, comparison and region state
    i18n.js              PL/UK/EN localization (Polish by default)
    styles.css           current application styles
tests/
  api.test.js            isolated API integration tests
  assistant.test.js      catalog assistant behavior
  icecat.test.js         device specification matching
```

## Межі поточної версії

Це завершений навчальний MVP для дипломної роботи, але не готовий платіжний сервіс. Оплата поки симулюється, зображення задаються URL або data URL, а повідомлення, доставка, повернення коштів і модерація продавців потребують окремої реалізації перед комерційним запуском.
