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


## NEITH ID / SUPABASE / STRIPE
Esta build añade UI de Login/Registro, Google/Discord OAuth mediante Supabase, Dashboard privado, perfiles con RLS y estructura de checkout/webhook Stripe para Cloudflare Pages Functions.

La activación se documenta en `SETUP_AUTH_STRIPE.md`. Las claves secretas se mantienen exclusivamente server-side.


## Production portability fix (20260921.4)
- Internal HTML/CSS/JS/image routes use relative paths.
- Main CSS and JS include cache-busting version `v=20260921.4`.
- Google Fonts imports Orbitron, Inter and Rajdhani directly from fonts.googleapis.com.
- External Supabase CDN remains an HTTPS absolute URL by design.
