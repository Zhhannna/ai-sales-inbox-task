# InboxIQ starter

Minimalny starter zadania rekrutacyjnego: React + Vite + TypeScript po stronie UI oraz Express + Prisma SQLite po stronie serwera. UI pokazuje inbox, szczegóły wiadomości i pusty pipeline; formularz ekstrakcji pozostaje zadaniem dla kandydata.

## Uruchomienie

```bash
npm install
npm run db:reset
npm run dev
```

Tryb developerski wystawia Vite pod `http://localhost:5173` i API Express pod `http://localhost:3001`. Proxy Vite przekazuje `/api` do Expressa. Dla zbudowanej wersji:

```bash
npm run build
PORT=4000 npm start
```

Express serwuje wtedy frontend i API z tego samego originu. `PORT` jest honorowany przez serwer.

## Widoki

- `/inbox` — lista dokładnie czterech wiadomości seed.
- `/inbox/:messageId` — sender, company, subject, body oraz placeholder `Lead extraction not implemented yet.`; kandydat dodaje formularz.
- `/pipeline` — pusty stan `No leads yet.`; seed nie tworzy leadów.

## Model danych

`Message` ma wyłącznie: `id`, `senderName`, `senderEmail`, `company`, `subject`, `body`, `createdAt`.

`Lead` ma: `id`, `sourceMessageId` (relacja do `Message` bez unique), `product`, `quantity` (`Int`), `material` (`String?`), `budget` (`Float?`), `status` (domyślnie `NEW`) i `createdAt`.

## API

- `GET /api/messages` — surowa tablica `Message[]`.
- `GET /api/messages/:messageId` — surowy obiekt `Message`.
- `GET /api/leads` — surowa tablica `Lead[]`, początkowo `[]`.
- `POST /api/leads` — celowo nie istnieje w starterze; kandydat dodaje endpoint z walidacją `sourceMessageId` i statusem `NEW` zgodnie z `TASK.md`.
- `POST /api/ai/extract` z `{ "messageId": "..." }` — deterministyczny fixture: `message-perfect` zwraca `{ product: "Desk", quantity: 30, material: "Oak", budget: 50000 }`, `message-partial` zwraca `{ product: "Ergonomic Chair", quantity: null, material: "Black", budget: 12000 }`, `message-failure` HTTP 500, a `message-empty` dokładnie `{}`.

`npm run db:reset` odtwarza bazę z wersjonowanej migracji Prisma, usuwa stare dane i seeduje dokładnie cztery wiadomości o ID `message-perfect`, `message-partial`, `message-failure`, `message-empty`. `DATABASE_URL` z procesu ma pierwszeństwo przed lokalnym fallbackiem `.env`.

## Kontrole

```bash
npm run typecheck
npm test
npm run build
```

`npm test` resetuje bazę i uruchamia testy Vitest przez Supertest.

## Git i sposób oddania

Pracuj jak w normalnym projekcie:

- utwórz osobny branch zamiast pracować bezpośrednio na `main`;
- podziel rozwiązanie na małe, logiczne commity zgodne z Conventional Commits, na przykład `feat: add lead creation endpoint`, `fix: preserve manual form edits` albo `test: cover lead validation`;
- nie oddawaj jednego zbiorczego commita typu `task done`;
- otwórz pull request do `main` i opisz zakres, najważniejsze decyzje oraz wykonane testy;
- do zgłoszenia dołącz link do repozytorium i pull requestu.
