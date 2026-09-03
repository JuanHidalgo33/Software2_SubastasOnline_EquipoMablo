# Documentación de la API (Entrega 1)

Esta es una API REST: el cliente pregunta y el servidor responde (ver
sección 4.6 del enunciado). Todas las rutas están bajo el prefijo `/api`.

Toda respuesta de error tiene esta forma (RNF-13):

\`\`\`json
{ "code": "CODIGO_DEL_ERROR", "message": "Explicación legible del error." }
\`\`\`

Las rutas marcadas con 🔒 requieren el encabezado
`Authorization: Bearer <token>`, con el token que devuelve el login.

---

## Usuarios y sesión

### `POST /api/users` — Registrar un usuario (RF-01)

Cuerpo:
\`\`\`json
{ "name": "Ana Gomez", "email": "ana@example.com", "password": "unaClaveSegura123" }
\`\`\`

Respuesta `201`:
\`\`\`json
{ "id": "…", "name": "Ana Gomez", "email": "ana@example.com", "registeredAt": "2026-01-01T00:00:00.000Z" }
\`\`\`

Errores posibles: `INVALID_EMAIL` (400), `EMAIL_ALREADY_REGISTERED` (400, RN-22).

### `POST /api/auth/login` — Iniciar sesión (RF-02)

Cuerpo:
\`\`\`json
{ "email": "ana@example.com", "password": "unaClaveSegura123" }
\`\`\`

Respuesta `200`:
\`\`\`json
{ "token": "eyJhbGciOi...", "user": { "id": "…", "name": "Ana Gomez", "email": "ana@example.com", "registeredAt": "..." } }
\`\`\`

Errores posibles: `INVALID_CREDENTIALS` (401).

### `GET /api/users/profile` 🔒 — Perfil del usuario autenticado (RF-03)

Respuesta `200`:
\`\`\`json
{
  "user": { "id": "…", "name": "Ana Gomez", "email": "ana@example.com", "registeredAt": "..." },
  "publishedAuctions": [ /* subastas, ver formato abajo */ ],
  "participatedAuctions": [ /* subastas en las que este usuario registró al menos una puja */ ]
}
\`\`\`

Errores posibles: `UNAUTHENTICATED` (401).

---

## Categorías

### `GET /api/categories` — Listar categorías (apoya el filtro de RF-05)

Respuesta `200`:
\`\`\`json
[ { "id": "cat-electronics", "name": "Electronics" }, { "id": "cat-home", "name": "Home" } ]
\`\`\`

---

## Subastas

Formato de una subasta en las respuestas:
\`\`\`json
{
  "id": "…",
  "sellerId": "…",
  "categoryId": "cat-electronics",
  "item": { "name": "Bicycle", "description": "Barely used", "condition": "Good" },
  "basePrice": 100000,
  "minIncrement": 10000,
  "publishedAt": "2026-01-01T00:00:00.000Z",
  "closesAt": "2026-01-02T00:00:00.000Z",
  "status": "OPEN",
  "totalBids": 1,
  "currentBid": { "id": "…", "auctionId": "…", "userId": "…", "amount": 100000, "date": "..." },
  "bidHistory": [ { "id": "…", "auctionId": "…", "userId": "…", "amount": 100000, "date": "..." } ],
  "winnerId": null,
  "paymentOrder": null
}
\`\`\`

`status` es uno de: `OPEN`, `CANCELLED`, `AWARDED`, `UNSOLD`.

### `POST /api/auctions` 🔒 — Publicar una subasta (RF-04)

Cuerpo:
\`\`\`json
{
  "categoryId": "cat-electronics",
  "item": { "name": "Bicycle", "description": "Barely used", "condition": "Good" },
  "basePrice": 100000,
  "minIncrement": 10000,
  "closesAt": "2026-01-02T00:00:00.000Z"
}
\`\`\`

Respuesta `201`: la subasta creada (formato de arriba).

Errores posibles: `INVALID_BASE_PRICE`, `INVALID_MIN_INCREMENT`,
`INVALID_CLOSING_DATE`, `INVALID_DURATION` (todos 400, RN-01 a RN-03),
`RESOURCE_NOT_FOUND` (404, si la categoría no existe).

### `GET /api/auctions` — Listar subastas, con filtros (RF-05)

Parámetros de consulta, todos opcionales: `categoryId`, `status`
(`OPEN`/`CANCELLED`/`AWARDED`/`UNSOLD`), `page` (por defecto 1),
`pageSize` (por defecto 10).

Respuesta `200`:
\`\`\`json
{ "items": [ /* subastas */ ], "page": 1, "pageSize": 10, "totalItems": 3, "totalPages": 1 }
\`\`\`

### `GET /api/auctions/:id` — Detalle de una subasta (RF-06)

Respuesta `200`: la subasta (formato de arriba). Cada consulta evalúa si la
subasta ya debe cerrarse (cierre perezoso, RN-13/RN-14/RN-16).

Errores posibles: `RESOURCE_NOT_FOUND` (404).

### `POST /api/auctions/:id/cancel` 🔒 — Cancelar una subasta (RF-07)

Solo el vendedor que la publicó puede cancelarla, y solo si aún no tiene
pujas (RN-04). Respuesta `204` (sin contenido) si se pudo cancelar.

Errores posibles: `RESOURCE_NOT_FOUND` (404), `FORBIDDEN` (403, si quien
pide la cancelación no es el vendedor), `AUCTION_NOT_CANCELLABLE` (400).

### `POST /api/auctions/:id/bids` 🔒 — Registrar una puja (RF-09, RF-10, RF-11)

Cuerpo:
\`\`\`json
{ "amount": 110000 }
\`\`\`

Respuesta `201` si se aceptó:
\`\`\`json
{ "id": "…", "auctionId": "…", "userId": "…", "amount": 110000, "date": "..." }
\`\`\`

Si se rechaza, la API responde `400` con el motivo exacto (RN-12), por
ejemplo:
\`\`\`json
{ "code": "INSUFFICIENT_BID", "message": "The bid must beat the current one by at least the minimum increment (RN-09)." }
\`\`\`

Otros códigos de rechazo posibles: `AUCTION_CLOSED` (RN-06),
`SELLER_CANNOT_BID` (RN-07), `BID_BELOW_BASE_PRICE` (RN-08),
`ALREADY_HIGHEST_BIDDER` (RN-10), `INVALID_AMOUNT` (RN-21).

---

## Pendiente para próximas entregas

- API de WebSockets para tiempo real (RF-12 a RF-16) — Entrega 2.
- Webhook de la pasarela de pagos (RF-18 a RF-20) — Entrega 2.
- Aplicación web que consuma esta API — Entrega 3.