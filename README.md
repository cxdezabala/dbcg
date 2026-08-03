# Handoff: PulsoPyme — sección de inteligencia de mercado para dbcg.es

## Overview
PulsoPyme es una plataforma de inteligencia de mercado para PyMEs españolas: centraliza precios históricos de materias primas por sector, indicadores estructurales (empresas, empleo, altas/bajas), la estructura de coste promedio real por sector, y un simulador de impacto de precio de insumos en el margen. Se integrará como nueva sección dentro de dbcg.es.

## About the Design Files
Los archivos de este paquete (`PulsoPyme.dc.html`, `Panel Principal - Opciones.dc.html`) son **referencias de diseño creadas en HTML** — prototipos de alta fidelidad que muestran look & feel e interacción esperada, no código de producción para copiar tal cual. La tarea es **recrear este diseño en el stack real de dbcg.es** (el framework/CMS que use el sitio) siguiendo sus patrones ya establecidos, reutilizando componentes existentes del sitio donde sea razonable.

`PulsoPyme.dc.html` es el prototipo final con las 3 pantallas conectadas (navegación real por clic). `Panel Principal - Opciones.dc.html` contiene 3 exploraciones visuales descartadas del panel principal — solo como referencia histórica de dirección de diseño, no implementar.

## Fidelity
**Alta fidelidad (hifi)**: colores finales, tipografía, espaciados e interacciones definidos. Recrear pixel-perfect usando las librerías/patrones ya existentes en dbcg.es.

## Paleta y tono visual
Concepto: "pulso" de la economía española — fondo oscuro (navy/negro casi puro) con acentos metálicos (oro, plata, platino) y líneas finas tipo mercado bursátil profesional, sin caer en el cliché "terminal neón" ni en el cliché "crema + serif + terracota".

- Fondo base: `#0a0e1a` (navy casi negro)
- Fondo de tarjetas: `#12151f`
- Header: `#05070d`, borde inferior `rgba(255,255,255,.08)`
- Texto principal: `#eef0f4`
- Texto secundario: `rgba(255,255,255,.4–.55)`
- Acento dorado (alertas, foco, CTA, presión alta): `#c9a227`
- Plata/gris neutro (presión media, texto secundario en gráficos): `#9aa0ab`
- Gris oscuro (presión baja / positivo): `#6b7280`
- Líneas divisorias: `rgba(255,255,255,.06–.1)`, 1px, siempre finas
- Tipografía: `IBM Plex Sans` (cuerpo/UI), `Newsreader` (cifras grandes, serif editorial), `IBM Plex Mono` (timestamps, valores tabulares, badges)
- Barras de progreso/estructura de coste: delgadas (7–9px), sin bordes gruesos
- Sliders: track 2px, thumb 10px circular con `currentColor`

## Screens / Views

### 1. Panel principal
- **Propósito**: vista general de "presión de costes" en los sectores/verticales disponibles; punto de entrada.
- **Layout**: header fijo (logo + nav) → título + fecha/fuentes → grid de 2 columnas (1.7fr / 1fr): tabla de sectores (izquierda) + panel "Últimas actualizaciones" (derecha) → banner de "próximamente" (informes/alertas).
- **Tabla de sectores**: filas con nombre del sector, badge de presión (ALTO/MEDIO/BAJO coloreado), variación interanual (IBM Plex Mono), sparkline delgada (1px stroke) de 12 meses, chevron de navegación. Click en fila → vista de detalle del vertical.
- **Últimas actualizaciones**: lista de eventos con timestamp relativo, texto breve (sector + insumo + variación + fuente), expandible al click mostrando una redacción corta de qué pasa y cómo afecta al margen del sector (border-left 2px dorado).

### 2. Vista de detalle de vertical
- **Propósito**: profundizar en un sector — precios, normalización, indicadores estructurales, estructura de coste.
- **Layout**: breadcrumb "← Panel" → título del sector + badge de presión + variación del índice compuesto → CTA "Simular impacto en margen" (botón dorado sólido) → secciones apiladas:
  1. **Ticker de materias primas clave**: tarjetas horizontales scrolleables (nombre, sparkline, precio crudo, variación interanual, fuente).
  2. **Capa de normalización** (pieza distintiva): por cada insumo, tarjeta dividida en 2 mitades separadas por un punto pulsante dorado — izquierda: precio de mercado crudo; derecha (fondo con tinte dorado sutil): "impacto por unidad de producto" (ej. "≈ 9,76 €/tonelada producida") + fórmula/supuesto de conversión en texto pequeño.
  3. **Indicadores estructurales**: 4 tarjetas (empresas activas, empleo, altas 12m, bajas 12m), cada una con su fuente (INE — DIRCE / EPA).
  4. **Estructura de coste promedio real**: barra apilada horizontal delgada (7px, gap 1px entre segmentos) + leyenda con % por partida + fuente (Banco de España — Central de Balances).

### 3. Simulador de impacto en margen
- **Propósito**: el usuario ajusta variables y ve el efecto en el margen de la empresa tipo, en tiempo real.
- **Layout**: breadcrumb → título → grid de 2 columnas:
  - **Izquierda — controles**: chips seleccionables por insumo del sector, slider de "peso del insumo en la estructura de coste" (0–60%), slider de "variación de precio esperada" (-30% a +60%), nota de metodología.
  - **Derecha — resultado**: margen actual vs. proyectado (cifras grandes Newsreader), badge de delta en puntos porcentuales (dorado si sube, gris si neutro/baja), barra fina (9px) comparando ambos márgenes, narrativa en texto plano generada según el resultado.
  - **Sección inferior — simulación combinada**: unifica variaciones sobre TODAS las partidas de la estructura de coste del vertical a la vez (no solo un insumo): un slider por partida + contribución individual en pp + margen combinado resultante + narrativa.
  - Banner "próximamente": guardar escenarios y alertas por umbral de margen.

## Interactions & Behavior
- Navegación por clic entre las 3 vistas (sin recarga de página, estado en memoria).
- Sliders actualizan resultado en tiempo real (`onChange`, sin debounce).
- Selección de insumo en el simulador vía chips (estado activo = fondo dorado sólido, texto navy).
- "Últimas actualizaciones": click en el ítem alterna expandir/contraer una descripción breve inline.
- Sin animaciones de transición entre vistas; sí un punto pulsante (`@keyframes pp-pulse`, 1.8s) en la capa de normalización como firma visual de "pulso".
- Hover: no definidos explícitamente en el prototipo — implementar estados hover sutiles (leve aclarado de fondo) en filas de tabla, chips y CTA siguiendo el patrón del sitio.

## State Management
- `view`: 'panel' | 'detalle' | 'simulador'
- `sectorId`: sector activo en detalle/simulador
- `insumoIdx`: insumo seleccionado en el simulador de insumo único
- `peso`, `variacion`: valores de los 2 sliders del simulador simple (null = usa default del insumo)
- `estrVars`: objeto `{ "<sectorId>_<idx partida>": variación% }` para el simulador combinado
- `expandedUpdate`: índice de la actualización expandida en el panel (o null)
- Todos los cálculos de margen son derivados (no se persisten): coste actual del sector × (1 + peso% × variación%) → margen = 100 − coste.

## Design Tokens
- Radios: 6–8px en tarjetas, 20px en badges/píldoras, 3–4px en barras finas
- Sombras: ninguna (diseño plano, se apoya en contraste de fondo oscuro y bordes de 1px)
- Espaciado de sección: ~28px entre bloques, 14–16px de gap en grids
- Fuente mínima de dato numérico visible: 12px (badges), cifras clave 19–30px (Newsreader)

## Assets
Sin imágenes ni iconos externos — todo el diseño usa tipografía (Google Fonts: IBM Plex Sans, Newsreader, IBM Plex Mono), SVG inline para sparklines/mini-gráficos, y CSS puro para barras/sliders.

## Files
- `PulsoPyme.dc.html` — prototipo completo, 3 pantallas conectadas (fuente principal de verdad para el handoff)
- `Panel Principal - Opciones.dc.html` — exploraciones visuales descartadas (solo referencia histórica, no implementar)
