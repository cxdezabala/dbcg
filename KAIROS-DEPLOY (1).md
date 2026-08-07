# Subir Kairos a dbcg.es, sustituyendo Monitor y PulsoPyme

`kairos.html` de este proyecto es un fichero plano y autocontenido (HTML + React vía CDN, sin build), en el mismo formato que `monitor.html` / `pulsopyme.html` del repo `cxdezabala/dbcg`. Está listo para subirse tal cual.

## 1. Añadir el archivo
Sube `kairos.html` a la raíz del repo (junto a `index.html`).

## 2. Quitar Monitor y PulsoPyme, añadir Kairos
En **index.html**:
- Línea ~150: sustituye los dos enlaces de nav
  - `<a href="monitor.html" class="lnk">Monitor</a>` y `<a href="pulsopyme.html" class="lnk">PulsoPyme</a>`
  - por: `<a href="kairos.html" class="lnk">Kairos</a>`
- Línea ~234-242: el bloque de la tarjeta "Monitor PyME · by DBCG" y su CTA `Entrar al Monitor PyME →` → cambia textos y el `href` a `kairos.html`, o sustitúyelo por una tarjeta de Kairos.
- Línea ~281 (footer): quita `<a href="pulsopyme.html">PulsoPyme</a>`, añade `<a href="kairos.html">Kairos</a>`.

En **aviso-legal.html** y **politica-privacidad.html**: sustituye los enlaces `<a href="monitor.html">...</a>` por `<a href="kairos.html">Kairos</a>` (y revisa las menciones de texto a «Monitor PyME» si quieres referenciar Kairos en su lugar).

En **vercel.json**, dentro de `"rewrites"`, sustituye estas dos líneas:
```json
{ "source": "/monitor", "destination": "/monitor.html" },
{ "source": "/pulsopyme", "destination": "/pulsopyme.html" },
```
por esta:
```json
{ "source": "/kairos", "destination": "/kairos.html" },
```

En **sitemap.xml**, borra el bloque `<url>` de `/monitor` y sustituye el de `/pulsopyme` por:
```xml
<url>
  <loc>https://www.dbcg.es/kairos</loc>
  <lastmod>2026-08-07</lastmod>
  <changefreq>weekly</changefreq>
  <priority>0.8</priority>
</url>
```

## 3. Eliminar los archivos antiguos
Borra del repo: `monitor.html`, `pulsopyme.html`, `pulsopyme-standalone.html`, `PulsoPyme.dc.html`, `Panel Principal - Opciones.dc.html`, y las imágenes `assets/og-monitor.png` si ya no se usan. También quita, en `aviso-legal.html` y `politica-privacidad.html`, las líneas `<a href="monitor.html" class="hide-sm">Monitor</a>` y `<a href="monitor.html">Monitor PyME</a>` (sustitúyelas por el enlace a `kairos.html` si quieres mantener la referencia).

## 4. El rectángulo "by DBCG" dentro de Kairos
Ya enlaza a `https://www.dbcg.es/` (la home, con las secciones "Cómo trabajo" y "Trayectoria").

## 5. Publicar
Con `git push` a `main`, Vercel redepliega solo — no hay pasos manuales adicionales.
