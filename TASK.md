# InboxIQ — zadanie dla kandydata

## Cel i czas

Zarezerwuj od 2 do 3 godzin na rozbudowę startera o mały, użyteczny przepływ inbox → ekstrakcja → lead. Zachowaj istniejący stack i kontrakt API. Liczy się czytelność, obsługa stanów, walidacja i poprawny model danych, nie liczba funkcji.

## Wymagany przepływ klienta

1. Na `/inbox` użytkownik wybiera wiadomość.
2. Na `/inbox/:messageId` klika dokładnie `Extract with AI`.
3. UI pokazuje i pozwala edytować pola z dokładnymi etykietami `Product`, `Quantity`, `Material`, `Budget`.
4. Użytkownik może poprawić wynik ręcznie i kliknąć dokładnie `Save lead`.
5. `Save lead` wysyła dane do `POST /api/leads`, a zapisany lead pojawia się na `/pipeline`.
6. Jeśli ekstrakcja nie zwróci danych albo zawiedzie, użytkownik nadal może wypełnić formularz ręcznie.
7. Ponowne kliknięcie `Extract with AI` może uzupełnić tylko puste pola. Nie może nadpisać wartości wpisanej lub poprawionej ręcznie przez użytkownika.
8. Na `/pipeline` użytkownik może kliknąć dokładnie `Mark as contacted` przy leadzie ze statusem `NEW`. UI aktualizuje status na `CONTACTED` bez przeładowania strony.

Nie dodawaj pola `Status` do formularza tworzenia leadu. Początkowy status jest własnością backendu i każdy nowy lead musi zostać zapisany jako `NEW`.

## Reguły backendu

`POST /api/leads` musi:

- wymagać istniejącego `sourceMessageId`;
- odrzucać pusty po trimie `product`;
- wymagać dodatniej liczby całkowitej `quantity`;
- przyjmować opcjonalny `material` jako tekst, `null` albo pustą wartość;
- przyjmować opcjonalny, skończony i nieujemny `budget`;
- ignorować albo odrzucać próbę ustawienia statusu przez klienta, ale nigdy nie zapisywać statusu innego niż `NEW`;
- pozwalać wielu leadom wskazywać tę samą wiadomość;
- zwracać błąd 4xx bez tworzenia rekordu, gdy payload jest niepoprawny.

Walidację granicy HTTP wykonaj przez Zod, a relację i typy utrzymaj w Prisma. `Lead` ma `id`, `sourceMessageId`, `product`, `quantity`, `material`, `budget`, `status` i `createdAt`.

`PATCH /api/leads/:leadId/status` musi:

- przyjmować wyłącznie `{ "status": "CONTACTED" }`;
- pozwalać tylko na przejście istniejącego leadu z `NEW` do `CONTACTED`;
- zwracać zaktualizowany surowy obiekt `Lead`;
- zwracać błąd 4xx bez zmiany rekordu dla nieznanego leadu, błędnego payloadu albo ponownej zmiany statusu;
- zachowywać status po restarcie aplikacji.

## Deterministyczny AI fixture

Nie integruj prawdziwego dostawcy AI. Istniejący `POST /api/ai/extract` jest stabilnym fixture:

- `message-perfect` → `{ product: "Desk", quantity: 30, material: "Oak", budget: 50000 }`;
- `message-partial` → `{ product: "Ergonomic Chair", quantity: null, material: "Black", budget: 12000 }`;
- `message-failure` → HTTP 500;
- `message-empty` → dokładnie `{}`.

Możesz używać Claude Code, Codex, Cursor, Copilot i innych coding assistantów lub agentów do implementacji i lokalnych testów. Oceniamy dostarczone oprogramowanie oraz Twoje rozumienie decyzji i kodu; nie karzemy za to, że AI wykonało większość pracy. Nie dodawaj zewnętrznego modelu, kluczy API ani sieciowego kroku do przepływu.

## Wymagania UX i dostępności

- Zachowaj trasy `/inbox`, `/inbox/:messageId`, `/pipeline`.
- Pokaż loading, pusty stan i błąd sieci.
- Błąd ekstrakcji i walidacji musi być widoczny dla czytnika ekranu w elemencie `role="alert"`.
- Formularz musi działać z klawiatury, mieć powiązane etykiety i sensowne stany disabled.
- Przycisk `Mark as contacted` musi być zablokowany podczas zapisu, a błąd zmiany statusu widoczny w elemencie `role="alert"`.
- Użyj dokładnych etykiet pól i nazw przycisków z tego dokumentu.
- Layout ma być responsywny i semantyczny.

## Istniejący kontrakt techniczny

- React + Vite + TypeScript, Express, Prisma SQLite, Zod, Vitest.
- `GET /api/messages` zwraca `Message[]`, a `GET /api/messages/:messageId` zwraca `Message` bez wrappera.
- `GET /api/leads` zwraca `Lead[]` bez wrappera.
- Seed zawiera dokładnie cztery kompletne zapytania sprzedażowe o stabilnych ID. Fixture AI zwraca kolejno wynik pełny, częściowy, błąd i pusty obiekt.
- Zbudowany Express serwuje frontend i API z tego samego originu oraz respektuje `PORT`; dev Vite proxy przekazuje `/api`.

## Definition of done

Uruchamiają się `npm install`, `npm run db:reset`, `npm run dev`, `npm run build`, `npm run typecheck`, `npm test` i `npm start`. Reset bazy korzysta z wersjonowanej migracji Prisma i respektuje `DATABASE_URL`.
