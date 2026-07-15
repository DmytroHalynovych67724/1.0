# Propozycja tematu pracy dyplomowej

## Temat

**Projekt i implementacja responsywnej platformy sprzedaży nowej i używanej elektroniki**

## Cel pracy

Celem pracy jest zaprojektowanie i wykonanie kompletnej aplikacji internetowej typu
marketplace, przeznaczonej wyłącznie do sprzedaży sprzętu elektronicznego. System łączy
funkcje sklepu internetowego i serwisu ogłoszeniowego: umożliwia przeglądanie nowych oraz
używanych urządzeń, wyszukiwanie i filtrowanie ofert, zapisywanie ulubionych produktów,
obsługę koszyka i składanie zamówień.

## Zakres pracy

- analiza wymagań oraz projekt architektury klient-serwer;
- responsywny interfejs użytkownika w HTML5, CSS3 i Vanilla JavaScript;
- katalog elektroniki z wyszukiwaniem, kategoriami, filtrami i sortowaniem;
- prezentacja stanu produktu (nowy/używany), marki, ceny, dostępności i sposobu dostawy;
- rejestracja i logowanie użytkowników z wykorzystaniem JWT oraz bcrypt;
- rozdzielenie uprawnień kupującego i administratora;
- koszyk, lista ulubionych oraz proces składania zamówienia;
- panel administracyjny do zarządzania ofertami;
- REST API w Node.js i Express oraz trwałe przechowywanie danych w SQLite;
- walidacja danych, podstawowe zabezpieczenia i kontrola dostępu;
- testy jednostkowe i integracyjne oraz automatyczna kontrola jakości w GitHub Actions;
- konteneryzacja aplikacji w Dockerze i przygotowanie dokumentacji wdrożeniowej.

## Technologie

- **Frontend:** HTML5, CSS3, Vanilla JavaScript;
- **Backend:** Node.js, Express;
- **Baza danych:** SQLite (`better-sqlite3`);
- **Bezpieczeństwo:** JWT, bcrypt, Helmet, rate limiting;
- **Testowanie i jakość:** Node.js Test Runner, ESLint, Prettier, GitHub Actions;
- **Uruchamianie i wdrożenie:** npm, Docker, Docker Compose, PM2.

## Rezultat

Rezultatem pracy będzie działający prototyp platformy e-commerce z kompletnym przepływem od
wyszukania produktu do złożenia zamówienia, panelem administracyjnym, dokumentacją techniczną
oraz zestawem automatycznych testów. Projekt będzie demonstrował praktyczne zastosowanie
architektury REST, relacyjnej bazy danych, mechanizmów autoryzacji i responsywnego projektowania
interfejsów webowych.

---

Autor: **[Imię i nazwisko]**

Promotor: **[Imię i nazwisko promotora]**
