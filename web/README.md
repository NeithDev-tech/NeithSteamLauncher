# Neith Steam Launcher — Web oficial V2

Web estática lista para Netlify, construida con HTML, CSS y JavaScript sin frameworks.

## Publicación en Netlify
1. Crea un sitio nuevo en Netlify o abre el sitio existente.
2. Sube el contenido de este ZIP conservando su estructura.
3. En Domain management añade `neithlauncher.com` y `www.neithlauncher.com`.
4. Configura el dominio principal que prefieras y deja que Netlify emita el certificado HTTPS automático.
5. Comprueba las rutas `/boostpc/`, `/hourboost/`, `/logros/` y `/juegos-gratis/`.

## Incluye
- Capturas reales optimizadas a WebP.
- Páginas completas por módulo.
- SEO, Open Graph, sitemap y robots.txt.
- 404 personalizada.
- Headers de seguridad y caché en `netlify.toml`.
- Área preparada para futuro Free/Premium sin compras ni lógica de licencia activa.

## Capturas
Las imágenes reales están en `img/`. Para sustituir una captura, conserva el nombre del archivo o actualiza su referencia HTML.


## NEITH ID / SUPABASE
Esta build incluye Login/Registro mediante Supabase, Dashboard privado y perfiles con RLS. En esta fase solo se activa email + contraseña; pagos y licencias se implementarán posteriormente.

La activación se documenta en `SETUP_AUTH_SUPABASE.md`. Las claves secretas se mantienen exclusivamente server-side.


## Production portability fix (20260921.4)
- Internal HTML/CSS/JS/image routes use relative paths.
- Main CSS and JS include cache-busting version `v=20260921.4`.
- Google Fonts imports Orbitron, Inter and Rajdhani directly from fonts.googleapis.com.
- External Supabase CDN remains an HTTPS absolute URL by design.

## FAQ / System Console
- La FAQ se ha retirado de la landing principal.
- Nueva página independiente: `/faq/`.
- Navegación por categorías, buscador local y acordeones interactivos.


## Producción 2026-09-21.9
- Cabecera y footer unificados en todas las vistas.
- Logo oficial y wordmark cromado consistentes.
- Hour Boost: simulador estabilizado contra scroll anchoring/reflow.
- Títulos LIVE FARM MONITOR y ESPECIFICACIONES DE GRADO GAMING unificados con el tratamiento chrome-blue principal.

## Juegos Gratis en tiempo real
La página `/juegos-gratis/` consulta `/api/free-games`, una Pages Function que obtiene promociones activas de juegos completos desde GamerPower, filtra las ofertas con acceso directo en tiendas compatibles y entrega solo datos de escaparate. La web no expone enlaces de reclamación: el acceso a las promociones se comunica como exclusivo desde Neith Launcher. Los datos de GamerPower se muestran con atribución visible conforme a sus condiciones de uso.

### Fallback de vista previa local (2026-09-22)
Si `/api/free-games` no está disponible (por ejemplo al abrir una copia estática/local), la interfaz intenta primero la API pública de GamerPower y, si el navegador bloquea CORS, usa un snapshot real verificado incluido en la build. Las promociones caducadas se descartan automáticamente; en producción, `/api/free-games` sigue siendo la fuente prioritaria y se refresca cada 15 minutos.
