# SYNERGON — MVP

*Intelligence · Alignment · Exponential Capabilities Enablement*

Plataforma B2B de inteligencia comercial para firmas de servicios profesionales, construida a partir del prototipo de `reference/` (fuente de verdad, solo lectura). **Todos los datos son ficticios** (Asterion Business Solutions).

## Puesta en marcha

```bash
cp .env.example .env
```

```bash
docker compose up -d
```

```bash
pnpm install
```

```bash
pnpm db:seed
```

```bash
pnpm dev
```

Abre http://localhost:3000. Con `DEMO_MODE=true` la pantalla de login muestra los 4 usuarios demo (contraseña: `DEMO_PASSWORD`, por defecto `synergon-demo`):

| Rol | Usuario | Email | Vistas |
|---|---|---|---|
| exec | Javier Morales, Commercial Executive | javier@asterion.example | todas excepto Command |
| lead | Laura Bennett, Commercial Team Leader | laura@asterion.example | todas; Command limitado a su equipo |
| director | Daniel Foster, Commercial Director | daniel@asterion.example | todas; Command a nivel de organización |
| admin | Omar Haddad, Platform Administrator | omar@asterion.example | solo Settings, nunca contenido de negocio |

Sin `ANTHROPIC_API_KEY`, SYNERGON AI usa las respuestas deterministas de `synergon-ai.js` portadas a TypeScript. Con la clave, usa Claude (`ANTHROPIC_MODEL`, por defecto `claude-sonnet-4-5`) con streaming.

## Stack

Next.js 15 (App Router) + TypeScript estricto · PostgreSQL + Prisma · Auth.js (credenciales + selector de rol demo; Microsoft Entra ID preparado con `AUTH_MICROSOFT_ENTRA_ID_*`) · Anthropic SDK · next-intl (EN/ES) · tokens Modernist + CSS Modules (sin Tailwind ni librerías de componentes) · iconos Lucide · Vitest + Playwright.

## Arquitectura

- `src/lib/demo/` — datos y lógica portados desde `reference/` (`scripts/port-reference.mjs` genera los `*.gen.ts`; `pipeline.ts` y `radar.ts` reproducen el generador y `analyse()`/`generic()`; los tests comprueban que coinciden 1:1 con el prototipo).
- `src/server/data/` — acceso a datos **con permisos**: cada función recibe el usuario y solo devuelve lo que su rol puede ver (reglas de CRM por cuenta, pipeline propio / de equipo / de organización, admin sin contenido de negocio).
- `src/server/vm/` — vistas de cada módulo calculadas en el servidor (port de `renderVals()` del prototipo). Al navegador solo llegan cifras ya filtradas.
- `src/server/actions/` — server actions persistidas (auditoría y notificaciones incluidas).
- `src/app/api/` — API REST con los mismos filtros (`/api/accounts`, `/api/pipeline`, `/api/solutions`, `/api/knowledge`, `/api/command`, `/api/settings`, `/api/audit`, `/api/search`, `/api/ai`).
- `src/server/integrations/` — adaptadores `CrmAdapter`, `CalendarAdapter`… con mocks que leen el seed y stubs de Salesforce (solo lectura) y Microsoft Graph.
- `src/middleware.ts` — autenticación y RBAC por ruta (`ACCESS`); además, cada página y cada consulta vuelven a comprobar el permiso.

### Privacidad y gobierno

- La información de liderazgo es siempre agregada; los grupos por debajo de `minGroup` (Settings → Políticas) se suprimen en el servidor y sus valores no se envían.
- Los mensajes privados 1:1 a expertos nunca aparecen en Command, Colaboración ni en el contexto de la IA.
- El admin no lee contenido de negocio por ninguna vía: UI, API (403) ni IA (misma negativa que el prototipo).
- Cada llamada a la IA se registra en `AuditLog`; el contenido solo si la política de gobierno de IA lo permite.
- Radar360 etiqueta cada dato como **Reportado**, **Estimado ±20%** o **Hipótesis de IA**; los financieros se guardan con `provenance` y fuente por campo.

### i18n

`messages/es.json` contiene el diccionario del prototipo (`synergon-i18n.js`) ampliado, y `src/i18n/translate.ts` sus reglas de patrones. `scripts/i18n-missing.mjs` y `scripts/i18n-check.ts` listan los textos de la interfaz sin traducción.

## Tests

```bash
pnpm typecheck && pnpm test
```

```bash
pnpm test:e2e
```

- **Vitest** (base de datos aparte `<db>_test`): porte fiel del pipeline, `analyse()`, caso de negocio, i18n y respuestas de IA; RBAC de todas las funciones de datos y del contexto de la IA.
- **Playwright**: escenario guiado completo "Oportunidad emergente de transformación con IA" (8/8 pasos, sin API key) y acceso por rol a vistas, API e IA, cambio EN/ES y `minGroup`.

## Escenario de demostración

Menú **Escenario** (barra superior) o el raíl de la Home: 1) inteligencia de cuenta → 2) conectar la señal S1 a Meridian → 3) enmarcar la solución → 4) movilizar a Sofia Chen → 5) lección contextual → 6) Daniel detecta el patrón → 7) lanza la iniciativa → 8) Javier la ve en su Home. **Reset demo data** restablece el seed (de forma atómica).
