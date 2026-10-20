# NEITH WEB — SHOUTBOX R207

- Diseño compacto, inspirado en un shoutbox clásico.
- Colocado antes de `SEE NEITH IN ACTION`.
- Lectura pública.
- Escritura solo para usuarios registrados en la web.
- Admin destacado con corona/color dorado.
- Admin puede borrar mensajes y banear usuarios del shoutbox.
- Tiempo real mediante Supabase Realtime.
- Anti-spam: 4 segundos entre mensajes.
- Enlaces bloqueados para usuarios normales.

## Supabase
La migración `v34_r207_home_shoutbox_compact` ya fue aplicada al proyecto **Neith Production**.
Las tablas `neith_shoutbox_messages` y `neith_shoutbox_bans` existen y `neith_shoutbox_messages` está publicada en `supabase_realtime`.
