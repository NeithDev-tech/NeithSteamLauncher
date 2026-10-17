# R167 — JUEGOS GRATIS LIVE RADAR RESTORE SAFE

- Eliminada la sección estática “UN RADAR REAL. MEJOR ORGANIZADO.”.
- Restaurado el radar web en directo con todas las promociones activas compatibles.
- Datos: `/api/free-games` como fuente principal, con fallback directo a GamerPower.
- Incluye Steam, Epic Games, GOG, Ubisoft Connect y Prime Gaming cuando la fuente correspondiente está disponible.
- Eliminado el límite artificial de 12 juegos en Cloudflare Pages Functions.
- Eliminado el snapshot local caducado para evitar mostrar promociones antiguas como actuales.
- Cuenta atrás de cada promoción, selección de tarjetas, imágenes, valor habitual y refresco automático.
- Reintento al recuperar conexión y al volver a la pestaña si no hay datos cargados.
