# Тестовое задание GG Store

Фуллстек-реализация тестового магазина цифровых товаров (ключи/пополнения/подписки/подарочные карты) с акцентом на устойчивость к гонкам, идемпотентность и восстановление.

## Стек

- Frontend: Nuxt 4 (Vue 3), CSS
- Backend: Nitro API (Node.js)
- База данных: PostgreSQL + Drizzle ORM

## Что реализовано

- Этап 1: верхняя часть витрины + поток create/pay/webhook/deliver
- Этап 2: однократная выдача при гонках вебхуков и дублирующих отправках
- Этап 3: восстановимые состояния out_of_stock / delivery_failed + admin retry
- Этап 4: промокоды с гарантией max_uses при параллельных запросах

## Быстрый старт

### 1) Окружение

Создайте `.env` в корне проекта:

```env
POSTGRES_URL=postgresql://postgres:postgres@localhost:5432/postgres
NUXT_PUBLIC_SITE_URL=http://localhost:3000
POSTGRES_DB=postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres

PROVIDER_A_FAIL_RATE=0.15
PROVIDER_A_TIMEOUT_RATE=0.10
PROVIDER_A_MIN_DELAY_MS=100
PROVIDER_A_MAX_DELAY_MS=800

PROVIDER_B_FAIL_RATE=0.10
PROVIDER_B_TIMEOUT_RATE=0.05
PROVIDER_B_MIN_DELAY_MS=50
PROVIDER_B_MAX_DELAY_MS=500
```

### 2) Запустите БД и примените схему

```bash
npm install
npm run docker
npm run db:push
```

### 3) Запустите приложение

```bash
npm run dev
```

Откройте `http://localhost:3000`.

### 4) Как записываются тестовые данные в БД при первом запуске

- `npm run db:push` создает/обновляет таблицы (схему БД).
- Тестовые данные (товары, промокоды, стартовый пул ключей) сидируются автоматически при первом обращении к API.
- Самый простой триггер сидирования: открыть `GET /api/products` (например, в браузере `http://localhost:3000/api/products`).
- Для ручного пополнения ключей используйте `POST /api/admin/restock`.

## Основные API

- `GET /api/products` - каталог после сидирования
- `GET /api/promocodes` - активные промокоды с оставшимися применениями
- `POST /api/orders/create` - создание заказа (`sku`, опционально `promoCode`, опционально заголовок `Idempotency-Key`)
- `GET /api/orders/:id` - статус заказа по внешнему id
- `POST /api/payments/simulate` - локальный симулятор оплаты, вызывающий webhook
- `POST /api/webhook/payment` - endpoint платежного webhook
- `GET /api/admin/recoverable` - оплаченные, но не доставленные/восстановимые заказы
- `POST /api/admin/retry-issue` - идемпотентный ручной retry выдачи
- `POST /api/admin/restock` - добавление ключей для sku

Стабы провайдеров по контракту:

- `POST /api/provider/a/issue`
- `POST /api/provider/b/issue`

## Коротко о надежности

1. Дедупликация webhook: уникальный `event_id` в `payment_events`.
2. Однократная выдача ключа: lock строки заказа + атомарная аллокация ключа в БД + уникальный `allocated_to_order_id` в пуле ключей.
3. Безопасные retry при timeout поставщика: одинаковый `request_id` возвращает один и тот же код из журнала provider request.
4. Восстановимые состояния: `out_of_stock` и `delivery_failed` восстанавливаются через безопасный admin retry.
5. Безопасность гонок промокодов: инкремент счетчика промокода атомарен с условием `used_count < max_uses` внутри транзакции.

## Как воспроизвести проверки гонок

### A) 50 параллельных paid webhook для одного заказа

```bash
npm run race:webhooks
```

Ожидаемый результат:

- статус заказа `delivered`
- привязан ровно один `delivered_code`
- нет дубля выдачи даже при 50 параллельных webhook
- скрипт также отправляет дубликат webhook с тем же `event_id`; второй вызов дедуплицируется и не должен менять итог

### B) Лимит промокода при параллельных запросах

```bash
npm run race:promo
```

Скрипт по умолчанию использует `LIMIT3` и 20 параллельных созданий заказа.
Ожидаемо: ровно 3 успешных применения промокода, остальные завершаются с `409`.

### C) Дублирующий webhook с тем же event_id

Уже покрыто в `npm run race:webhooks` (`duplicate_event_statuses` в выводе).
Ожидаемо: второй webhook с тем же `event_id` дедуплицируется и не меняет результат доставки заказа.

### D) Обработка out-of-order / раннего webhook

```bash
npm run race:outoforder
```

Ожидаемый результат:

- ранний `paid` webhook (пришел до создания заказа) сохраняется и позже корректно reconcile-ится
- позднее событие `failed` не ломает уже оплаченный/выдаваемый поток
- финальный заказ обрабатывается корректно без дубля выдачи

### E) Out of stock и восстановление

1. Создайте и оплатите заказ для sku без ключей в пуле (например, `STEAM-TOPUP-500`).
2. Убедитесь в статусе `out_of_stock`.
3. Добавьте ключи через `/api/admin/restock`.
4. Вызовите `/api/admin/retry-issue`.
5. Заказ должен перейти в `delivered` с ровно одним ключом.

### F) Live-обновление витрины и гонка за последнюю единицу

1. Запустите приложение и откройте две вкладки с витриной (`http://localhost:3000`).
2. Добавьте ровно один ключ для SKU `STEAM-TOPUP-500` через `/api/admin/restock`:

```bash
curl -X POST http://localhost:3000/api/admin/restock \
   -H "content-type: application/json" \
   -d '{"sku":"STEAM-TOPUP-500","keys":["LAST-UNIT-001"]}'
```

3. Одновременно отправьте два запроса создания заказа с этим SKU (в двух терминалах или параллельно скриптом).
4. Ожидаемый результат гонки:

- один запрос успешный (`200`)
- второй получает `409` (`Item just sold out` / `SOLD_OUT_RACE`)

5. Ожидаемый результат live-витрины:

- во второй вкладке доступность SKU обновится примерно за 1 секунду через SSE (`/api/stream/stock`)
- кнопка покупки станет неактивной, а при проигрыше гонки на фронте показывается сообщение, что товар закончился

## Реализованные фронтенд-взаимодействия

- Карусель баннера (автопрокрутка + стрелки + активные точки)
- Открытие/закрытие dropdown каталога + закрытие по клику вне блока
- Активные состояния переключателя валют (`$/₸/₽`)
- Подсветка иконок сервисов при hover
- Эффекты карточек товаров при hover (подъем/граница/тень)

## Команды

```bash
npm run build
npm run preview
npm run db:generate
npm run db:push
npm run race:webhooks
npm run race:promo
npm run race:outoforder
```

## Сдача

1. Ссылка на live-демо: `отсутствует`
2. Исходники: `https://github.com/aidarmrzk/game_market`
3. Как воспроизвести проверки гонок:
   - `npm run race:webhooks`
   - `npm run race:promo`
   - `npm run race:outoforder`
   - recovery flow через `/api/admin/restock` + `/api/admin/retry-issue`
   - live-витрина + гонка за последнюю единицу: см. пункт `F` выше
4. Как обеспечена exactly-once выдача:
   - Выдача заказа выполняется в единой DB-транзакции с lock строки заказа, поэтому только один поток может финализировать доставку для этого order.
   - Аллокация ключа атомарна в БД и привязана к одному заказу (`license_keys.allocated_to_order_id` unique), поэтому расходуется ровно один ключ.
5. Фактическое время: `8h`
