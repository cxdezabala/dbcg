# Prompt para Claude Code: construir el MVP de SYNERGON

> Pega esto en Claude Code desde la raíz de un repositorio vacío. Copia antes en `/reference` estos archivos del prototipo: `SYNERGON.dc.html`, `synergon-data.js`, `synergon-radar.js`, `synergon-pipeline.js`, `synergon-ai.js`, `synergon-i18n.js` y la carpeta `_ds/modernist-*/` (styles.css).

---

## Rol y objetivo

Eres un ingeniero full-stack sénior. Construye el **MVP de SYNERGON**, una plataforma B2B de inteligencia comercial para firmas de servicios profesionales (consultoría y formación ejecutiva). El prototipo de `/reference` es la **fuente de verdad** de pantallas, flujos, textos y datos demo. No rediseñes nada: lleva el prototipo a una aplicación real, con autenticación, persistencia, permisos por rol e IA real.

Lema: *Intelligence · Alignment · Exponential Capabilities Enablement*.

## Stack

- **Next.js 15 (App Router) + TypeScript estricto**, React Server Components donde tenga sentido
- **PostgreSQL + Prisma**, con seed generado a partir de `/reference/synergon-*.js`
- **Auth.js** (credenciales + 4 usuarios demo; dejar preparado SSO con Microsoft Entra)
- **Anthropic SDK** (`claude-sonnet-4-5`) para SYNERGON AI, con streaming
- **next-intl** para EN/ES; migrar el diccionario de `synergon-i18n.js` a `messages/en.json` y `messages/es.json`
- CSS: importar `styles.css` de Modernist como capa de tokens y usar CSS Modules. Sin Tailwind ni librerías de componentes.
- Gráficos: SVG propio o `visx`, fiel al estilo plano del prototipo
- Tests: Vitest (lógica) y Playwright (flujo demo de principio a fin)
- `docker-compose.yml` para Postgres; `.env.example`

## Sistema visual (no negociable)

Design system **Modernist**: fuente Archivo, fondo `#f3f2f2`, texto `#201e1d`, un único acento `#ec3013`. **Radio 0 en todo**, separadores de 2px (`--color-divider`), rejilla modular visible, todo alineado a la izquierda (también las etiquetas de los botones), iconos Lucide, fotos en escala de grises. El rojo se usa poco: acción principal y énfasis. Usa siempre los tokens `var(--*)` y nunca valores hex sueltos. Foco: `outline 2px accent, offset 2px`. Incluye modo claro y oscuro.

## Roles y acceso (RBAC en servidor)

Usa `ROLE_INFO` y `ACCESS` de `synergon-data.js`:

| Rol | Usuario demo | Vistas |
|---|---|---|
| exec | Javier Morales, Commercial Executive | todas excepto Command |
| lead | Laura Bennett, Team Leader (10 ejecutivos) | todas; Command limitado a su equipo |
| director | Daniel Foster, Commercial Director | todas; Command a nivel de organización |
| admin | Omar Haddad, Platform Admin | solo Settings; **nunca ve contenido de negocio** |

- Los permisos se aplican en el servidor (middleware y en cada consulta), no solo ocultando elementos en la UI.
- La información de liderazgo es siempre agregada, con un **tamaño mínimo de grupo** configurable (`minGroup`). El contenido de colaboración privada 1:1 nunca llega a liderazgo.
- La búsqueda global solo devuelve resultados autorizados para el rol.
- Habrá un selector de rol demo en la barra lateral, solo cuando `DEMO_MODE=true`.

## Shell

Barra lateral fija de 240px: marca, navegación numerada 01–06, separador "Leadership layer" antes de Command, Settings y Help, y en el pie el estado de integraciones ("4 de 5 conectadas"). Barra superior con búsqueda global, notificaciones (marcar todo como leído), selector EN/ES, modo claro/oscuro y "Reset demo data". Panel lateral de **SYNERGON AI** disponible en todas las vistas, con sugerencias según la vista (`SUGGEST` en `synergon-ai.js`).

## Módulos (replicar fielmente desde `SYNERGON.dc.html`)

0. **Home**: resumen según el rol con desempeño comercial YTD (pipeline abierto, ponderado, ganado, perdido, tasa de éxito, cuota), pipeline por etapa, ganado vs perdido, ganado por mes, "Tu posición" (peso en equipo, UN y organización), principales oportunidades, prioridades ordenadas por IA, semana, crecimiento, actividad de colaboración y el **escenario de demostración guiado** ("Oportunidad emergente de transformación con IA"), con pasos en los que se puede hacer clic.
1. **Commercial Intelligence AI**: interpreta el CRM pero no lo sustituye; Salesforce es de **solo lectura**. Pipeline y operaciones (filtros por etapa y equipo, cerrados recientemente, "por qué perdemos"), cuentas estratégicas, resumen de cuenta, mapa de relaciones, interacciones, insights de IA, acciones sugeridas, señales Radar360 conectadas, "Generar briefing", "Crear hipótesis de oportunidad" y "Enviar al Estudio de Diseño".
2. **Radar360**: ficha de cliente y preparación de reuniones, con un enfoque Consulting o Executive education. Pestañas: Resumen, Finanzas, Stakeholders, Competencia y Plan de reunión. Hay "+ Nueva empresa", que usa `analyse()` y `generic()` con benchmarks sectoriales (`BENCH`). Cada dato lleva **siempre** una de estas etiquetas: *Reportado*, *Estimado (±20%)* o *Hipótesis de IA*. Incluye también el radar de señales de mercado.
3. **Solution Design Studio**: del reto de negocio a la propuesta ejecutiva, usando frameworks, packs y el caso de negocio con supuestos sometidos a prueba de estrés. Las soluciones se guardan (semilla `SEED_SOLUTIONS`).
4. **Capabilities & Growth**: capacidades (`CAPS`), microaprendizaje contextual (`LESSON`), role-play (`ROLEPLAY`) y formación asignada. Completar un curso se registra **por separado** de la capacidad demostrada.
5. **Collaboration & Contribution**: directorio de expertos, solicitudes a expertos, conocimiento validado (flujo de validación de aportaciones) y comunidades.
6. **SYNERGON Command** (lead y director): patrones organizativos (`THEMES`), recomendaciones de liderazgo, alineamiento con la estrategia y lanzamiento de iniciativas que se asignan a equipos y aparecen en su Home.
- **Settings & Integrations**: usuarios y roles, integraciones (Salesforce, M365/Calendar, LinkedIn, LMS…), políticas de acceso a datos, gobierno de IA y log de auditoría. Los usuarios que no son admin solo ven el estado y sus preferencias.

## Modelo de datos (Prisma, mínimo)

`Organization, Team, User(role), Account, Contact(stance,strength), Interaction, Opportunity(stage,value,close,next,status,lossReason), Company(Radar: financials JSON, provenance por campo), Signal, Solution, BusinessCase, Expert, ExpertRequest, KnowledgeItem(status: draft/validated), Capability, LearningAssignment, Initiative, Notification, AuditLog, IntegrationConnection, AiConversation/AiMessage`.

Los campos de Radar guardan su `provenance: REPORTED | ESTIMATED | AI_HYPOTHESIS` y la fuente.

## SYNERGON AI

- Ruta `/api/ai` con streaming. El system prompt incluye el rol, la vista y la entidad activa, y **solo** los datos que ese rol puede ver (contexto ya filtrado en el servidor).
- Las respuestas siguen el formato `{text, lines[], sources[]}` del prototipo: siempre citan las fuentes y marcan las hipótesis.
- Si no hay `ANTHROPIC_API_KEY`, se usa como **fallback** `synergon-ai.js` (respuestas deterministas) portado a TypeScript.
- El rol admin recibe la misma negativa que en el prototipo cuando pregunta por contenido de negocio.
- Todas las llamadas a la IA se registran en AuditLog (sin el contenido si la política lo prohíbe).

## Integraciones

En el MVP, cada integración es un **adaptador con interfaz** (`CrmAdapter`, `CalendarAdapter`…) con una implementación mock que lee el seed. Los adaptadores reales de Salesforce (solo lectura) y Microsoft Graph quedan definidos como stub con TODO. Cada integración muestra la hora de la última sincronización ("CRM-synced today 08:12").

## Orden de trabajo

1. Scaffold, tokens Modernist, shell, i18n y auth con los 4 usuarios demo.
2. Esquema Prisma y seed portado desde `/reference` (mismos nombres, cifras e IDs).
3. Home y Commercial Intelligence.
4. Radar360 (incluida la lógica `analyse()` y las etiquetas de procedencia).
5. Studio, Growth y Collaboration.
6. Command y Settings (RBAC, minGroup y auditoría).
7. SYNERGON AI real con fallback.
8. Escenario demo guiado de principio a fin, test Playwright del escenario completo para cada rol y "Reset demo data".

Al terminar cada fase: `pnpm typecheck && pnpm test`, commit y un resumen breve. Si un detalle no está claro, consulta `/reference/SYNERGON.dc.html` antes de inventar nada.

## Criterios de aceptación

- Cada pantalla coincide visualmente con el prototipo: radio 0, reglas de 2px y textos alineados a la izquierda.
- El cambio EN/ES cubre el 100% de la interfaz.
- Ningún endpoint devuelve datos fuera del alcance del rol (hay tests de esto).
- El admin no puede leer contenido de negocio por ninguna vía: UI, API ni IA.
- Todo dato de Radar360 muestra su procedencia.
- El escenario demo completo funciona sin API key (con el fallback).
- `docker compose up && pnpm db:seed && pnpm dev` deja la demo lista.
- Todos los datos son ficticios (organización Asterion Business Solutions) y así se indica en la UI.
