# DBCG — Sitio web (www.dbcg.es)

Sitio estático de **Digital Business Consulting Group S.L.** Sin framework, sin build, sin dependencias. Solo HTML, CSS en línea y dos imágenes. Carga rápido y se ve bien en móvil.

---

## 1. Estructura del proyecto

```
/
├── index.html              → Home (se sirve en www.dbcg.es)
├── monitor.html            → Monitor PyME (www.dbcg.es/monitor y /monitor.html)
├── aviso-legal.html        → Aviso legal (LSSI-CE)
├── politica-privacidad.html→ Política de privacidad (RGPD)
├── assets/
│   ├── dbcg-mark.png        → Logo pequeño "DBCG" (barra de navegación)
│   ├── dbcg-logo.png        → Logo completo (footer de la home)
│   ├── favicon-512/180/32/16.png, favicon.png, favicon.ico
│   ├── og-image.png         → Imagen para compartir la home (1200×630)
│   └── og-monitor.png       → Imagen para compartir el Monitor (1200×630)
├── favicon.ico             → Favicon en la raíz
├── vercel.json             → Rutas limpias, redirección www, cache de /assets
├── robots.txt
├── sitemap.xml
└── README.md
```

> Los logos, que antes iban incrustados en base64 dentro del HTML, ahora son archivos PNG en `/assets`. Esto reduce el peso de `index.html` de ~172 KB a ~20 KB y de `monitor.html` de ~95 KB a ~38 KB.

---

## 2. Datos de la empresa y contacto

Los datos identificativos de las páginas legales ya están rellenados con la información del Registro Mercantil:

| Dato             | Valor                                                 |
|------------------|-------------------------------------------------------|
| Razón social     | Digital Business Consulting Group S.L.                |
| NIF              | B87533139                                             |
| Domicilio social | Calle Segundo Mata, 1, 28224 Pozuelo de Alarcón (Madrid) |
| Contacto         | LinkedIn — https://www.linkedin.com/in/cdezabala/     |

> **Contacto:** el sitio no usa correo electrónico. Todas las vías de contacto (home y páginas legales) apuntan al perfil de LinkedIn `https://www.linkedin.com/in/cdezabala/`. Para cambiarlas, busca y reemplaza esa URL en los `.html`. Verifica el código postal (28224) por si necesitara ajuste.

---

## 3. Subir el proyecto a GitHub

1. Crea un repositorio nuevo en GitHub (por ejemplo `dbcg-web`), vacío y privado.
2. Desde la carpeta del proyecto, en una terminal:

   ```bash
   git init
   git add .
   git commit -m "Sitio DBCG — versión inicial"
   git branch -M main
   git remote add origin https://github.com/TU-USUARIO/dbcg-web.git
   git push -u origin main
   ```

   > Si no usas terminal, también puedes arrastrar todos los archivos a un repositorio nuevo desde la web de GitHub ("uploading an existing file").

---

## 4. Desplegar en Vercel

1. Entra en [vercel.com](https://vercel.com) e inicia sesión (puedes usar tu cuenta de GitHub).
2. **Add New… → Project**.
3. Importa el repositorio `dbcg-web`.
4. En la configuración del proyecto:
   - **Framework Preset:** `Other` (no es necesario ningún framework).
   - **Build Command:** déjalo **vacío**.
   - **Output Directory:** déjalo **vacío** (la raíz del repo ya contiene el sitio).
5. Pulsa **Deploy**. En unos segundos tendrás una URL `*.vercel.app` para comprobar que todo funciona.

Comprueba que cargan: `/`, `/monitor`, `/monitor.html`, `/aviso-legal`, `/politica-privacidad` y que las imágenes de `/assets` se ven.

---

## 5. Conectar el dominio www.dbcg.es

En el proyecto de Vercel: **Settings → Domains**.

1. Añade `www.dbcg.es` → será el dominio principal.
2. Añade `dbcg.es` → Vercel lo redirigirá automáticamente a `www.dbcg.es` (también lo fuerza `vercel.json`).

Después, en tu **proveedor de DNS** (donde tengas registrado el dominio), crea estos registros:

| Tipo  | Nombre / Host | Valor                   |
|-------|---------------|-------------------------|
| `A`   | `@` (raíz)    | `76.76.21.21`           |
| `CNAME` | `www`       | `cname.vercel-dns.com`  |

> ⚠️ **NO toques los registros `MX`.** Si los borras o modificas, dejarás de recibir correo en `@dbcg.es`. Añade solo los registros `A` y `CNAME` indicados; deja el resto como está.

La propagación de DNS puede tardar desde unos minutos hasta 24-48 h. Vercel emite el certificado HTTPS automáticamente cuando detecta los registros correctos.

---

## 6. Qué hace `vercel.json`

- **Rutas limpias:** `/monitor` sirve `monitor.html` (también funciona `/monitor.html`). Igual para `/aviso-legal` y `/politica-privacidad`.
- **Redirección:** cualquier visita a `dbcg.es` (sin www) se redirige de forma permanente a `https://www.dbcg.es`.
- **Cache:** los archivos de `/assets` se cachean un año (`immutable`); el HTML siempre se revalida para que los cambios se vean al instante.

---

## 7. Actualizar el sitio más adelante

Cada vez que hagas `git push` a la rama `main`, Vercel vuelve a desplegar automáticamente. No hay pasos manuales.

---

## Notas técnicas

- **Sin cookies de terceros** ni analítica: la política de privacidad ya lo refleja.
- **Accesibilidad:** imágenes con `alt`, foco de teclado visible, enlace "saltar al contenido" en las páginas legales y buen contraste sobre el fondo oscuro.
- **Compartir en redes:** las etiquetas Open Graph y Twitter Card ya están puestas; al pegar el enlace en LinkedIn o WhatsApp se mostrará `og-image.png` (home) u `og-monitor.png` (Monitor).
