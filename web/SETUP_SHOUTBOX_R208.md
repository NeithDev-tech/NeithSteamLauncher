# NEITH WEB — SHOUTBOX R208

## Cambios R208
- shoutbox más ancho y más compacto;
- ocupa el ancho del bloque superior;
- menor altura visual;
- eliminados los botones `SIGN IN / CREATE ACCOUNT` del bloque de invitado;
- scroll estabilizado para que no salte al leer mensajes anteriores;
- mensajes visibles y purgados automáticamente tras 5 minutos;
- mejora de detección de sesión para mostrar el input al usuario logueado con más fiabilidad.

## Base de datos
La función `public.neith_shoutbox_prune_expired()` debe existir en Supabase.
Esta revisión ya está preparada para invocarla desde el frontend.
