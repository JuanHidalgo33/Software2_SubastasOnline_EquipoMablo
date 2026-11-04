# Software2_SubastasOnline_EquipoMablo

**Nombre de la Materia:** Electiva Software II

**Nombre del Proyecto:** Subastas Electiva II — Plataforma de Subastas en Línea

**Equipo:** Mablo

**Integrantes:**
* Juan Hidalgo
* Camilo Muñoz

**Descripción:**
API REST en Node.js, Express y TypeScript para una plataforma de subastas
en línea. Implementa el modelo de dominio (publicar una subasta, pujar,
cancelar, cerrar y vencer la orden de pago), persistencia en SQLite,
comunicación en tiempo real por WebSockets (nuevas pujas, avisos de
superación y cierre), una API versionada bajo `/api/v1` con middlewares de
seguridad y documentación interactiva con Swagger. El webhook de pagos y
el frontend van en la siguiente entrega.

**Requerimientos:**
* Node.js 20+ (lo exige `better-sqlite3`)
* TypeScript
* Express
* better-sqlite3 (persistencia)
* ws (WebSockets)
* jsonwebtoken y bcryptjs (login y contraseñas)
* helmet, cors y express-rate-limit (seguridad)
* swagger-ui-express (documentación interactiva)
* uuid
* Jest (pruebas)

**Instrucciones de compilación y ejecución:**
```bash
git clone https://github.com/JuanHidalgo33/Software2_SubastasOnline_EquipoMablo.git
cd Software2_SubastasOnline_EquipoMablo
npm install
cp .env.example .env
```

Abrir `.env` y asignar un valor a `JWT_SECRET`, por ejemplo `JWT_SECRET=dev-secret`. Sin ese valor el servidor no arranca.

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
```

Casi todas las reglas de negocio (publicación, pujas, cierre, cancelación)
están concentradas en `src/domain/entities/Auction.ts`.
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

## Endpoints principales

Todas las rutas van bajo `/api`.

| Recurso | Rutas |
|---|---|
| Usuarios / sesión | `POST /users`, `POST /auth/login`, `GET /users/profile`  |
| Categorías | `GET /categories` |
| Subastas | `POST /auctions` , `GET /auctions`, `GET /auctions/:id`, `POST /auctions/:id/cancel` , `POST /auctions/:id/bids`  |

Detalle completo (cuerpos, respuestas, errores) en [`docs/API.md`](docs/API.md).

## Variables de entorno

Ver `.env.example`. Las importantes son `PORT`, `JWT_SECRET` (obligatoria),
`JWT_EXPIRES_IN` y `BCRYPT_SALT_ROUNDS`.

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
- `fix(http): returned 422 when a bid is rejected`
- `test(domain): added tests for auction closing rules`

No se aceptan mensajes genéricos (`changes`, `fix stuff`, `update`) ni
commits que mezclen dos cambios: si el mensaje necesita un "and", son
dos commits.

El título del Pull Request sigue la misma convención. La descripción del
PR y los comentarios de revisión se escriben en español.

### Versiones

Cada entrega se marca con una etiqueta anotada sobre `main`:
`v1.0`, `v2.0`, `v3.0`.