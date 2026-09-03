# Software2_SubastasOnline_EquipoMablo

**Nombre de la Materia:** Electiva Software II

**Nombre del Proyecto:** Subastas Electiva II — Plataforma de Subastas en Línea

**Equipo:** Mablo

**Integrantes:**
* Juan Hidalgo
* Camilo Muñoz

**Descripción:**
API REST en Node.js, Express y TypeScript para una plataforma de subastas
en línea. En esta primera entrega implementamos el modelo de dominio
(las reglas del negocio: publicar una subasta, pujar, cancelar y cerrar) y
los endpoints de la API, guardando todo en memoria por ahora. Falta lo de
WebSockets, el webhook de pagos y el frontend, que van en las siguientes
entregas.

**Requerimientos:**
* Node.js 18+
* TypeScript
* Express
* jsonwebtoken y bcryptjs (login y contraseñas)
* uuid
* Jest (pruebas)

**Instrucciones de compilación y ejecución:**
```bash
git clone <https://github.com/JuanHidalgo33/Software2_SubastasOnline_EquipoMablo.git>
cd subastas-online
npm install
cp .env.example .env      # completar JWT_SECRET con cualquier texto largo
npm install express jsonwebtoken bcryptjs uuid dotenv
npm install -D typescript @types/node @types/express @types/jsonwebtoken @types/bcryptjs @types/uuid ts-node-dev jest ts-jest @types/jest
npm run dev                # http://localhost:3000
```
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
    http/            Rutas, controladores y middlewares de Express.
    persistence/     Repositorios en memoria (un Map).
    seguridad/       bcrypt y JWT.
    composicion.ts   Aquí se conecta todo (qué implementación usa cada
                     puerto). Para cambiar a una base de datos real, solo
                     se toca este archivo.
```

Casi todas las reglas de negocio (publicación, pujas, cierre, cancelación)
están concentradas en `src/domain/entities/Actuion.ts`.
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
| Usuarios / sesión | `POST /usuarios`, `POST /auth/login`, `GET /usuarios/perfil`  |
| Categorías | `GET /categorias` |
| Subastas | `POST /subastas` , `GET /subastas`, `GET /subastas/:id`, `POST /subastas/:id/cancelar` , `POST /subastas/:id/pujas`  |

Detalle completo (cuerpos, respuestas, errores) en [`docs/API.md`](docs/API.md).

## Variables de entorno

Ver `.env.example`. Las importantes son `PORT`, `JWT_SECRET` (obligatoria),
`JWT_EXPIRES_IN` y `BCRYPT_SALT_ROUNDS`.

## Branching y commits

- `main` siempre debe quedar funcionando.
- `branch` develope.
