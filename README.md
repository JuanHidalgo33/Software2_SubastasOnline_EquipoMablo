# Software2_SubastasOnline_EquipoMablo

**Nombre de la Materia:** Electiva Software II

**Nombre del Proyecto:** Subastas Electiva II — Plataforma de Subastas en Línea

**Equipo:** Mablo

**Integrantes:**
* Juan Hidalgo
* Camilo Muñoz

**Descripción:**
Plataforma de subastas en línea. El backend es una API REST en Node.js,
Express y TypeScript que implementa el modelo de dominio (publicar una
subasta, pujar, cancelar, cerrar, generar y vencer la orden de pago),
persistencia en SQLite, comunicación en tiempo real por WebSockets (nuevas
pujas, avisos de superación, cierre y pago confirmado), un webhook firmado
para recibir las notificaciones de la pasarela de pagos, una API versionada
bajo `/api/v1` con middlewares de seguridad y documentación interactiva con
Swagger. El frontend es una aplicación web en React que consume esa API
(carpeta `web/`).

**Requerimientos:**
* Node.js 20+ (lo exige `better-sqlite3`)
* TypeScript
* Express
* better-sqlite3 (persistencia)
* ws (WebSockets)
* jsonwebtoken y bcryptjs (login y contraseñas)
* helmet, cors y express-rate-limit (seguridad)
* swagger-ui-express (documentación interactiva)
* Jest (pruebas)
* Frontend: React 19, Vite y react-router-dom (en `web/`, con su propio `package.json`)

**Instrucciones de compilación y ejecución:**
```bash
git clone https://github.com/JuanHidalgo33/Software2_SubastasOnline_EquipoMablo.git
cd Software2_SubastasOnline_EquipoMablo
npm install
cp .env.example .env
```

Abrir `.env` y asignar un valor a `JWT_SECRET` y a `PAYMENT_WEBHOOK_SECRET`,
por ejemplo `JWT_SECRET=dev-secret` y `PAYMENT_WEBHOOK_SECRET=dev-webhook-secret`.
Sin esos valores el servidor no arranca. Los valores reales van solo en `.env`
(ignorado por Git), nunca en `.env.example`.

```bash
npm run dev
```

- API: `http://localhost:3000/api/v1`
- Documentación interactiva (Swagger): `http://localhost:3000/api/v1/docs`
- Tiempo real: `ws://localhost:3000/ws`

La base de datos se crea sola en `./data/auctions.db` la primera vez.

En Windows con `cmd`, usar `copy .env.example .env` en lugar de `cp`.

Para producción: `npm run build` y luego `npm start`.
Para correr las pruebas: `npm test`.

### Frontend

Con el backend corriendo, en otra terminal:

```bash
cd web
npm install
cp .env.example .env
npm run dev
```

- Aplicación web: `http://localhost:5173`

`web/.env.example` ya trae las direcciones por defecto del backend
(`VITE_API_URL` y `VITE_WS_URL`); solo hay que cambiarlas si la API corre
en otro puerto. Para generar la versión de producción: `npm run build`
dentro de `web/`.

**Licencia:** UNLICENSED (proyecto académico).

---

## Estructura del proyecto

Organizamos el código en 3 capas, siguiendo arquitectura hexagonal, para
que las reglas del negocio no dependan de Express, JWT ni nada externo:

```
src/
  domain/          Las reglas del negocio puras (no importa nada externo).
    entities/        Subasta, Usuario, Categoria, Puja, OrdenDePago, etc.
    value-objects/   Dinero y Email (se validan solos).
    ports/           Interfaces que domain necesita (repositorios, reloj, id).

  application/     Los casos de uso (registrar usuario, publicar subasta,
                    pujar, etc.). Solo orquestan el dominio, no tienen
                    reglas propias.

  infrastructure/  Todo lo que depende de una tecnología concreta:
    http/            Rutas, controladores, middlewares y Swagger.
    persistence/     Repositorios en memoria y en SQLite (sqlite/).
    events/          Adaptadores del puerto de eventos: consola,
                     WebSocket y uno compuesto que reparte a ambos.
    realtime/        Servidor WebSocket: conexiones y suscripciones.
    security/        bcrypt y JWT.
    composition.ts   Aquí se conecta todo (qué implementación usa cada
                     puerto). Cambiar de base de datos o agregar un
                     canal de eventos solo toca este archivo.

docs/
  API.md           Referencia de la API en texto.
  openapi.yaml     Especificación OpenAPI que sirve Swagger.

tools/
  realtime-demo/   Página para probar el tiempo real con dos pestañas.
  payment-gateway/ Simulador de la pasarela de pagos (envía notificaciones
                   firmadas al webhook).

web/               Aplicación web en React + Vite + TypeScript.
  src/api/           Cliente HTTP y funciones por recurso de la API.
  src/auth/          Sesión (token en localStorage) y contexto de usuario.
  src/realtime/      Conexión WebSocket a una subasta.
  src/pages/         Login, registro, listado, publicar y detalle de subasta.
  src/components/    Encabezado, cambio de tema claro/oscuro, avisos, etc.
```

Casi todas las reglas de negocio (publicación, pujas, cierre, cancelación
y vencimiento del pago) están concentradas en `src/domain/entities/Auction.ts`.

## Reglas de negocio principales

- **Publicar subasta:** precio base e incremento mínimo mayores que cero;
  la fecha de cierre debe ser después de la de publicación; la subasta
  debe durar entre 1 hora y 30 días.
- **Pujar:** solo sobre subastas abiertas; el vendedor no puede pujar en
  su propia subasta; la primera puja debe ser ≥ al precio base; cada puja
  debe superar a la vigente en al menos el incremento mínimo; no se puede
  superar la propia puja si ya se es el mejor postor; una puja aceptada no
  se puede quitar. Si se rechaza una puja, queda registrado el motivo.
- **Cancelar:** solo el vendedor puede cancelar, y solo si la subasta
  todavía no tiene pujas.
- **Cierre:** al consultar una subasta se revisa si ya debía cerrarse; si
  tuvo pujas se adjudica al mejor postor y se genera una orden de pago; si
  no tuvo pujas queda "desierta". Una subasta solo se cierra una vez.
- **Pago:** la orden de pago tiene un plazo de 48 horas. Si vence sin
  confirmación, la orden queda vencida y la subasta en incumplimiento
  (`DEFAULTED`). Solo una notificación de pago exitoso, con firma válida
  y antes del vencimiento, confirma la orden. Cada notificación se procesa
  una sola vez aunque la pasarela la reenvíe.

## Endpoints principales

Todas las rutas van bajo `/api/v1`. Una ruta inexistente responde 404 con el formato `{ code, message }`.

| Recurso | Rutas |
|---|---|
| Usuarios / sesión | `POST /users`, `POST /auth/login`, `GET /users/profile` |
| Categorías | `GET /categories` |
| Subastas | `POST /auctions`, `GET /auctions`, `GET /auctions/:id`, `POST /auctions/:id/cancel` |
| Pujas | `POST /auctions/:id/bids` |
| Pagos | `GET /auctions/:id/payment-order` (solo el ganador), `POST /payments/webhook` (pasarela, con firma) |

Para probarlas desde el navegador, abrir Swagger en `http://localhost:3000/api/v1/docs`.

Detalle completo (cuerpos, respuestas, errores) en [`docs/API.md`](docs/API.md).

## Variables de entorno

Ver `.env.example`.

| Variable | Para qué | Por defecto |
|---|---|---|
| `PORT` | Puerto del servidor | `3000` |
| `JWT_SECRET` | Firma de los tokens. **Obligatoria** | — |
| `JWT_EXPIRES_IN` | Duración del token | `2h` |
| `PAYMENT_WEBHOOK_SECRET` | Clave para verificar la firma del webhook de pagos. **Obligatoria** | — |
| `BCRYPT_SALT_ROUNDS` | Costo del cifrado de contraseñas | `10` |
| `CORS_ORIGIN` | Sitios que pueden llamar a la API | `*` |
| `RATE_LIMIT_WINDOW_MS` | Ventana del límite de peticiones | `900000` (15 min) |
| `RATE_LIMIT_MAX` | Peticiones por IP en esa ventana | `100` |
| `PERSISTENCE` | `sqlite` o `memory` | `sqlite` |
| `DATABASE_PATH` | Archivo de la base de datos | `./data/auctions.db` |

## Persistencia

Los datos se guardan en SQLite (`better-sqlite3`). Elegimos SQLite porque
no requiere instalar un servidor de base de datos: el proyecto corre con
`npm install` y `npm run dev` (RNF-11, RNF-18). La base se crea sola al
arrancar, con las categorías iniciales, y su archivo está ignorado por Git.

La persistencia es un adaptador de los puertos del dominio. Con
`PERSISTENCE=memory` el sistema vuelve a los repositorios en memoria sin
cambiar dominio ni aplicación (RNF-06).

El dominio no se modificó para la persistencia: para reconstruir una
subasta guardada, el repositorio reproduce su historia con los métodos
públicos del dominio (`publish`, `placeBid`, `cancel`, `evaluateClosing`,
`evaluatePaymentDeadline`). Así el dominio vuelve a validar cada paso.

## Tiempo real (WebSockets)

Conexión: `ws://localhost:3000/ws?token=<JWT>`, con el token de
`POST /api/v1/auth/login`. Sin token válido, la conexión se cierra con el
código `4401`.

El cliente se suscribe a una subasta enviando:

```json
{ "type": "subscribe", "auctionId": "..." }
```

Mensajes que envía el servidor:

| Mensaje | Cuándo | A quién |
|---|---|---|
| `bid.placed` | Se acepta una puja (incluye `currentAmount`) | Todos los suscritos |
| `notification` con `BID_OUTBID` | Alguien superó la puja del usuario | Solo al postor superado |
| `auction.closed` | La subasta se cerró (`AWARDED` o `UNSOLD`) | Todos los suscritos |
| `notification` con `AUCTION_WON` / `AUCTION_CLOSED` | Al cerrar | Al ganador y al vendedor |
| `notification` con `PAYMENT_CONFIRMED` | Se confirmó el pago de la orden | Solo al ganador |
| `auction.presence` | Alguien se conecta o desconecta | Todos los suscritos |

Los casos de uso publican los hechos del negocio por un puerto de salida
(`AuctionEventPublisher`) y no conocen la librería de WebSockets (RNF-05).
Cada evento también se registra en consola (RNF-17).

Para probarlo con dos clientes, abrir `tools/realtime-demo/index.html` en
dos pestañas, cada una con el token de un usuario distinto.

## Webhook de pagos

No se integra una pasarela real; el proyecto trae un simulador que hace el
papel de la pasarela y envía notificaciones al webhook
`POST /api/v1/payments/webhook`.

- **Autenticidad:** cada notificación lleva el encabezado
  `X-Signature: sha256=<hex>`, un HMAC-SHA256 del cuerpo exacto calculado
  con `PAYMENT_WEBHOOK_SECRET`. Si la firma falta o no coincide, se responde
  401 `INVALID_SIGNATURE` y no se procesa nada.
- **Idempotencia:** cada notificación trae un `eventId`. Si llega repetido
  se responde `DUPLICATE` sin volver a procesarlo. Los eventos se guardan en
  la tabla `payment_events` (con `external_event_id` único), así que la
  protección se mantiene aunque el servidor se reinicie.
- **Resultado:** un pago `SUCCESSFUL` sobre una orden `PENDING` la deja
  `CONFIRMED` y avisa al ganador por WebSocket; un pago `FAILED` o sobre una
  orden ya vencida o confirmada solo queda registrado (`RECORDED`).

Uso del simulador (con el backend corriendo y el mismo `.env`):

```bash
npm run gateway:pay -- <paymentOrderId>                 # pago exitoso
npm run gateway:pay -- <paymentOrderId> FAILED          # pago fallido
npm run gateway:pay -- <paymentOrderId> --event evt-1   # repetir con el mismo eventId → DUPLICATE
npm run gateway:pay -- <paymentOrderId> --bad-signature # firma inválida → 401
```

El `paymentOrderId` se obtiene con `GET /api/v1/auctions/:id/payment-order`
(como ganador) o en Swagger.

## Flujo de demostración

1. Levantar el backend (`npm run dev`) y el frontend (`cd web && npm run dev`).
2. En `http://localhost:5173`, registrar dos usuarios: un vendedor y un
   comprador (usar dos navegadores o una ventana de incógnito).
3. Con el vendedor, publicar una subasta. Debe durar al menos 1 hora (RN-03),
   por eso para la demostración conviene poner el cierre justo una hora después.
4. Con el comprador, abrir la subasta y pujar. El vendedor ve la puja en
   tiempo real sin recargar; si otro usuario supera la puja, el comprador
   recibe el aviso.
5. Al llegar la fecha de cierre, la cuenta regresiva recarga la subasta y
   queda adjudicada (`AWARDED`) al mejor postor con su orden de pago.
6. Obtener el id de la orden (`GET /auctions/:id/payment-order` con el token
   del ganador, desde Swagger) y simular el pago con
   `npm run gateway:pay -- <paymentOrderId>`. La orden queda `CONFIRMED` y
   el ganador recibe la notificación `PAYMENT_CONFIRMED`.
7. Repetir el mismo `eventId` con `--event` para ver la respuesta
   `DUPLICATE`, y probar `--bad-signature` para ver el 401.

## Flujo de trabajo con Git

### Ramas

- `main`: versión estable, siempre ejecutable. Está protegida en GitHub:
  no acepta push directo ni force push, y solo recibe cambios mediante
  Pull Request con al menos una aprobación del otro integrante.
- Ramas de trabajo: se crean desde `main`, una por tarea, con el patrón
  `tipo/descripcion-corta` en inglés y sin tildes:

| Prefijo | Uso | Ejemplo |
|---|---|---|
| `feature/` | Funcionalidad nueva | `feature/websocket-subscriptions` |
| `fix/` | Corrección de un error | `fix/closing-date-validation` |
| `refactor/` | Cambio interno sin alterar el comportamiento | `refactor/auction-encapsulation` |
| `docs/` | Documentación | `docs/openapi-swagger` |
| `chore/` | Configuración, dependencias, scripts | `chore/update-dependencies` |
| `release/` | Preparación de una entrega | `release/v2.0` |

Las ramas se borran después de fusionarse.

### Flujo de una tarea

1. Actualizar `main`: `git switch main` y `git pull`.
2. Crear la rama: `git switch -c feature/...`.
3. Hacer commits pequeños y frecuentes, con `push` al final de cada sesión.
4. Abrir un Pull Request hacia `main` y asignar al otro integrante como revisor.
5. El revisor prueba la rama (`npm test` y `npm run build`), comenta y aprueba.
6. El autor fusiona con *merge commit* (squash y rebase están deshabilitados
   para conservar el historial completo de commits).

### Convención de commits

Seguimos [Conventional Commits](https://www.conventionalcommits.org/):
mensajes en inglés, en minúscula y con el verbo en pasado, como indica
la guía del curso.

Formato: `<type>(<scope opcional>): <description>`

| Tipo | Uso |
|---|---|
| `feat` | Funcionalidad nueva |
| `fix` | Corrección de un error |
| `test` | Pruebas nuevas o modificadas |
| `docs` | Documentación |
| `refactor` | Cambio interno sin alterar el comportamiento |
| `chore` | Configuración, dependencias, scripts |

Alcances sugeridos: `domain`, `application`, `http`, `ws`, `persistence`.

Ejemplos:
- `feat(domain): added minimum increment validation to placeBid`
- `fix(domain): rejected auctions with invalid closing date`
- `test(domain): added tests for auction closing rules`

No se aceptan mensajes genéricos (`changes`, `fix stuff`, `update`) ni
commits que mezclen dos cambios: si el mensaje necesita un "and", son
dos commits.

El título del Pull Request sigue la misma convención. La descripción del
PR y los comentarios de revisión se escriben en español.

### Versiones

Cada entrega se marca con una etiqueta anotada sobre `main`:
`v1.0`, `v2.0`, `v3.0`.
